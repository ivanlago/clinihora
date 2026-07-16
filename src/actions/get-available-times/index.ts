"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import {
  appointmentIntervalsOverlap,
  clockTimeToMinutes,
  DEFAULT_APPOINTMENT_DURATION_IN_MINUTES,
} from "@/_helpers/appointment-time";
import { generateTimeSlots } from "@/_helpers/time";
import { db } from "@/db";
import { appointmentsTable, doctorsTable, proceduresTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { clinicDate, clinicTime } from "@/lib/clinic-time";
import { actionClient } from "@/lib/safe-action";
// import { actionClient } from "@/lib/next-safe-action";

export const getAvailableTimes = actionClient
  .schema(
    z.object({
      doctorId: z.string(),
      date: z.string().date(), // YYYY-MM-DD,
      procedureId: z.string().uuid().nullable().optional(),
    })
  )
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      throw new Error("Unauthorized");
    }
    if (!session.user.clinic) {
      throw new Error("Clínica não encontrada");
    }
    const doctor = await db.query.doctorsTable.findFirst({
      where: and(
        eq(doctorsTable.id, parsedInput.doctorId),
        eq(doctorsTable.clinicId, session.user.clinic.id)
      ),
    });
    if (!doctor) {
      throw new Error("Médico não encontrado");
    }
    const procedure = parsedInput.procedureId
      ? await db.query.proceduresTable.findFirst({
          where: and(
            eq(proceduresTable.id, parsedInput.procedureId),
            eq(proceduresTable.clinicId, session.user.clinic.id),
            eq(proceduresTable.isActive, true)
          ),
        })
      : undefined;
    if (parsedInput.procedureId && !procedure) {
      throw new Error("Procedimento não encontrado ou inativo");
    }
    const selectedDayOfWeek = clinicDate(parsedInput.date).day();
    const selectedDay = (doctor.availableDays ?? []).find(
      (day) => day.dayOfWeek === selectedDayOfWeek
    );
    if (!selectedDay) {
      return [];
    }
    const appointments = await db.query.appointmentsTable.findMany({
      where: and(
        eq(appointmentsTable.doctorId, parsedInput.doctorId),
        eq(appointmentsTable.clinicId, session.user.clinic.id)
      ),
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
          clinicTime(appointment.date).format("YYYY-MM-DD") === parsedInput.date
      )
      .map((appointment) => ({
        start: clockTimeToMinutes(
          clinicTime(appointment.date).format("HH:mm:ss")
        ),
        duration:
          appointment.procedure?.durationInMinutes ??
          DEFAULT_APPOINTMENT_DURATION_IN_MINUTES,
      }));
    const timeSlots = generateTimeSlots();

    const doctorAvailableFrom = selectedDay.fromTime;
    const doctorAvailableTo = selectedDay.toTime;
    const requestedDuration =
      procedure?.durationInMinutes ?? DEFAULT_APPOINTMENT_DURATION_IN_MINUTES;

    const doctorTimeSlots = timeSlots.filter((time) => {
      return time >= doctorAvailableFrom && time <= doctorAvailableTo;
    });
    return doctorTimeSlots.map((time) => {
      return {
        value: time,
        available: !appointmentsOnSelectedDate.some((appointment) =>
          appointmentIntervalsOverlap({
            firstStart: clockTimeToMinutes(time),
            firstDuration: requestedDuration,
            secondStart: appointment.start,
            secondDuration: appointment.duration,
          })
        ),
        label: time.substring(0, 5),
      };
    });
  });
