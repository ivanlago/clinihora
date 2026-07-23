import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  appointmentIntervalsOverlap,
  clockTimeToMinutes,
  DEFAULT_APPOINTMENT_DURATION_IN_MINUTES,
} from "@/_helpers/appointment-time";
import { generateTimeSlots } from "@/_helpers/time";
import { db } from "@/db";
import {
  appointmentsTable,
  doctorsTable,
  proceduresTable,
  proceduresToDoctorsTable,
} from "@/db/schema";
import { clinicDate, clinicTime } from "@/lib/clinic-time";
import { handleN8nApiError, requireN8nClinicAuth } from "@/lib/n8n-api";

const searchSchema = z
  .object({
    doctorId: z.string().uuid().optional(),
    date: z.string().date(),
    procedureId: z.string().uuid().optional(),
    time: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/).optional(),
  })
  .refine((input) => input.doctorId || input.procedureId, {
    message: "Informe doctorId ou procedureId",
  });

export const GET = async (request: NextRequest) => {
  const auth = requireN8nClinicAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const input = searchSchema.parse({
      doctorId: request.nextUrl.searchParams.get("doctorId") ?? undefined,
      date: request.nextUrl.searchParams.get("date"),
      procedureId:
        request.nextUrl.searchParams.get("procedureId") ?? undefined,
      time: request.nextUrl.searchParams.get("time") ?? undefined,
    });

    const procedure = input.procedureId
      ? await db.query.proceduresTable.findFirst({
          where: and(
            eq(proceduresTable.id, input.procedureId),
            eq(proceduresTable.clinicId, auth.clinicId),
            eq(proceduresTable.isActive, true)
          ),
          with: { proceduresToDoctors: true },
        })
      : undefined;
    if (input.procedureId && !procedure) {
      throw new Error("Procedimento não encontrado ou inativo");
    }

    const allowedIds = procedure?.proceduresToDoctors.map(
      (item) => item.doctorId
    );
    if (procedure && allowedIds?.length === 0) {
      if (input.doctorId) {
        throw new Error("Este procedimento não utiliza profissional");
      }
      const times = generateTimeSlots().map((value) => ({
        value,
        label: value.substring(0, 5),
        available: true,
      }));
      return NextResponse.json({
        date: input.date,
        procedure: {
          id: procedure.id,
          name: procedure.name,
          durationInMinutes: procedure.durationInMinutes,
        },
        requiresProfessional: false,
        requestedTimeAvailable: input.time ? true : undefined,
        professionals: [],
        times,
      });
    }

    if (
      input.doctorId &&
      allowedIds?.length &&
      !allowedIds.includes(input.doctorId)
    ) {
      throw new Error("Profissional não habilitado para este procedimento");
    }

    const doctors = input.doctorId
      ? await db.query.doctorsTable.findMany({
          where: and(
            eq(doctorsTable.id, input.doctorId),
            eq(doctorsTable.clinicId, auth.clinicId)
          ),
        })
      : (
          await db.query.proceduresToDoctorsTable.findMany({
            where: eq(proceduresToDoctorsTable.procedureId, procedure!.id),
            with: { doctor: true },
          })
        ).map((item) => item.doctor);

    if (!doctors.length) throw new Error("Profissional não encontrado");

    const requestedDuration =
      procedure?.durationInMinutes ?? DEFAULT_APPOINTMENT_DURATION_IN_MINUTES;
    const dayOfWeek = clinicDate(input.date).day();
    const professionals = await Promise.all(
      doctors.map(async (doctor) => {
        const selectedDay = (doctor.availableDays ?? []).find(
          (day) => day.dayOfWeek === dayOfWeek
        );
        if (!selectedDay) {
          return { id: doctor.id, name: doctor.name, specialty: doctor.specialty, times: [] };
        }
        const appointments = await db.query.appointmentsTable.findMany({
          where: and(
            eq(appointmentsTable.clinicId, auth.clinicId),
            eq(appointmentsTable.doctorId, doctor.id)
          ),
          with: { procedure: true },
        });
        const busy = appointments
          .filter(
            (appointment) =>
              clinicTime(appointment.date).format("YYYY-MM-DD") === input.date
          )
          .map((appointment) => ({
            start: clockTimeToMinutes(
              clinicTime(appointment.date).format("HH:mm:ss")
            ),
            duration:
              appointment.procedure?.durationInMinutes ??
              DEFAULT_APPOINTMENT_DURATION_IN_MINUTES,
          }));
        const times = generateTimeSlots()
          .filter(
            (time) =>
              time >= selectedDay.fromTime && time <= selectedDay.toTime
          )
          .map((value) => ({
            value,
            label: value.substring(0, 5),
            available: !busy.some((appointment) =>
              appointmentIntervalsOverlap({
                firstStart: clockTimeToMinutes(value),
                firstDuration: requestedDuration,
                secondStart: appointment.start,
                secondDuration: appointment.duration,
              })
            ),
          }));
        return {
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
          requestedTimeAvailable: input.time
            ? times.some(
                (slot) =>
                  slot.value.substring(0, 5) === input.time!.substring(0, 5) &&
                  slot.available
              )
            : undefined,
          times,
        };
      })
    );

    return NextResponse.json({
      date: input.date,
      procedure: procedure
        ? {
            id: procedure.id,
            name: procedure.name,
            durationInMinutes: procedure.durationInMinutes,
          }
        : null,
      requiresProfessional: true,
      professionals,
      // Kept for compatibility when a specific professional is requested.
      doctor: input.doctorId ? professionals[0] : undefined,
      times: input.doctorId ? professionals[0]?.times ?? [] : undefined,
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
