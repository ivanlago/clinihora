import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateTimeSlots } from "@/_helpers/time";
import { db } from "@/db";
import { appointmentsTable, doctorsTable } from "@/db/schema";
import { clinicDate, clinicTime } from "@/lib/clinic-time";
import { handleN8nApiError, requireN8nClinicAuth } from "@/lib/n8n-api";

const availableTimesSearchSchema = z.object({
  doctorId: z.string().uuid(),
  date: z.string().date(),
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
    });
    const appointmentsOnSelectedDate = appointments
      .filter(
        (appointment) =>
          clinicTime(appointment.date).format("YYYY-MM-DD") === input.date
      )
      .map((appointment) => clinicTime(appointment.date).format("HH:mm:ss"));
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
        available: !appointmentsOnSelectedDate.includes(time),
      })),
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
