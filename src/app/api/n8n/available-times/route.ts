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
import { appointmentsTable, doctorsTable, proceduresTable } from "@/db/schema";
import { clinicDate, clinicTime } from "@/lib/clinic-time";
import { handleN8nApiError, requireN8nClinicAuth } from "@/lib/n8n-api";

const availableTimesSearchSchema = z.object({
  doctorId: z.string().uuid(),
  date: z.string().date(),
  procedureId: z.string().uuid().optional(),
});

export const GET = async (request: NextRequest) => {
  const auth = requireN8nClinicAuth(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const input = availableTimesSearchSchema.parse({
      doctorId: request.nextUrl.searchParams.get("doctorId"),
      date: request.nextUrl.searchParams.get("date"),
      procedureId:
        request.nextUrl.searchParams.get("procedureId") ?? undefined,
    });
    const doctor = await db.query.doctorsTable.findFirst({
      where: and(
        eq(doctorsTable.id, input.doctorId),
        eq(doctorsTable.clinicId, auth.clinicId)
      ),
    });

    if (!doctor) {
      throw new Error("Médico não encontrado");
    }

    const procedure = input.procedureId
      ? await db.query.proceduresTable.findFirst({
          where: and(
            eq(proceduresTable.id, input.procedureId),
            eq(proceduresTable.clinicId, auth.clinicId),
            eq(proceduresTable.isActive, true)
          ),
        })
      : undefined;

    if (input.procedureId && !procedure) {
      throw new Error("Procedimento não encontrado ou inativo");
    }

    const selectedDayOfWeek = clinicDate(input.date).day();
    const selectedDay = (doctor.availableDays ?? []).find(
      (day) => day.dayOfWeek === selectedDayOfWeek
    );

    if (!selectedDay) {
      return NextResponse.json({
        doctor,
        date: input.date,
        times: [],
      });
    }

    const appointments = await db.query.appointmentsTable.findMany({
      where: and(
        eq(appointmentsTable.clinicId, auth.clinicId),
        eq(appointmentsTable.doctorId, input.doctorId)
      ),
      columns: {
        date: true,
      },
      with: {
        procedure: {
          columns: {
            durationInMinutes: true,
          },
        },
      },
    });
    const appointmentsOnSelectedDate = appointments
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
    const requestedDuration =
      procedure?.durationInMinutes ?? DEFAULT_APPOINTMENT_DURATION_IN_MINUTES;
    const doctorTimeSlots = generateTimeSlots().filter((time) => {
      return time >= selectedDay.fromTime && time <= selectedDay.toTime;
    });

    return NextResponse.json({
      doctor: {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
      },
      date: input.date,
      times: doctorTimeSlots.map((time) => ({
        value: time,
        label: time.substring(0, 5),
        available: !appointmentsOnSelectedDate.some((appointment) =>
          appointmentIntervalsOverlap({
            firstStart: clockTimeToMinutes(time),
            firstDuration: requestedDuration,
            secondStart: appointment.start,
            secondDuration: appointment.duration,
          })
        ),
      })),
      procedure: procedure
        ? {
            id: procedure.id,
            name: procedure.name,
            durationInMinutes: procedure.durationInMinutes,
          }
        : null,
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
