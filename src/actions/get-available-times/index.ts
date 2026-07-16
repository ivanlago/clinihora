"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { generateTimeSlots } from "@/_helpers/time";
import { db } from "@/db";
import { appointmentsTable, doctorsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { clinicDate, clinicTime } from "@/lib/clinic-time";
import { actionClient } from "@/lib/safe-action";
// import { actionClient } from "@/lib/next-safe-action";

export const getAvailableTimes = actionClient
  .schema(
    z.object({
      doctorId: z.string(),
      date: z.string().date(), // YYYY-MM-DD,
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
      where: eq(doctorsTable.id, parsedInput.doctorId),
    });
    if (!doctor) {
      throw new Error("Médico não encontrado");
    }
    const selectedDayOfWeek = clinicDate(parsedInput.date).day();
    const selectedDay = (doctor.availableDays ?? []).find(
      (day) => day.dayOfWeek === selectedDayOfWeek
    );
    if (!selectedDay) {
      return [];
    }
    const appointments = await db.query.appointmentsTable.findMany({
      where: eq(appointmentsTable.doctorId, parsedInput.doctorId),
    });
    const appointmentsOnSelectedDate = appointments
      .filter(
        (appointment) =>
          clinicTime(appointment.date).format("YYYY-MM-DD") === parsedInput.date
      )
      .map((appointment) => clinicTime(appointment.date).format("HH:mm:ss"));
    const timeSlots = generateTimeSlots();

    const doctorAvailableFrom = selectedDay.fromTime;
    const doctorAvailableTo = selectedDay.toTime;

    const doctorTimeSlots = timeSlots.filter((time) => {
      return time >= doctorAvailableFrom && time <= doctorAvailableTo;
    });
    return doctorTimeSlots.map((time) => {
      return {
        value: time,
        available: !appointmentsOnSelectedDate.includes(time),
        label: time.substring(0, 5),
      };
    });
  });
