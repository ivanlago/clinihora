"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { appointmentsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  deleteAppointmentFromGoogleCalendar,
  syncAppointmentToGoogleCalendar,
} from "@/lib/google-calendar";
import { actionClient } from "@/lib/safe-action";

import { validateAppointment } from "../_helpers/validate-appointment";

const upsertAppointmentSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().min(1),
  doctorId: z.string().uuid().nullable().optional(),
  date: z.date(),
  appointmentPriceInCents: z.number().min(1),
  type: z.enum(["consultation", "procedure"]),
  procedureId: z.string().uuid().nullable().optional(),
});

export type UpsertAppointmentSchema = z.infer<typeof upsertAppointmentSchema>;

export const upsertAppointment = actionClient
  .schema(upsertAppointmentSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.clinic) {
      throw new Error("Unauthorized");
    }

    if (parsedInput.id) {
      // Update existing appointment
      const appointment = await db.query.appointmentsTable.findFirst({
        where: eq(appointmentsTable.id, parsedInput.id),
      });

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      if (appointment.clinicId !== session.user.clinic.id) {
        throw new Error("Appointment not found");
      }

      const { doctor, procedure } = await validateAppointment({
        appointmentId: parsedInput.id,
        clinicId: session.user.clinic.id,
        patientId: parsedInput.patientId,
        doctorId: parsedInput.doctorId,
        date: parsedInput.date,
        type: parsedInput.type,
        procedureId: parsedInput.procedureId,
      });

      if (appointment.doctorId !== parsedInput.doctorId) {
        await deleteAppointmentFromGoogleCalendar({
          appointmentId: appointment.id,
          doctorId: appointment.doctorId!,
          eventId: appointment.googleCalendarEventId,
          calendarId: appointment.googleCalendarId,
        });
      }

      await db
        .update(appointmentsTable)
        .set({
          patientId: parsedInput.patientId,
          doctorId: parsedInput.doctorId,
          date: parsedInput.date,
          type: parsedInput.type,
          procedureId: parsedInput.type === "procedure" ? parsedInput.procedureId : null,
          appointmentPriceInCents:
            procedure?.priceInCents ?? doctor!.appointmentPriceInCents,
          updatedAt: new Date(),
        })
        .where(eq(appointmentsTable.id, parsedInput.id));

      await syncAppointmentToGoogleCalendar({
        appointmentId: parsedInput.id,
      });

      revalidatePath("/appointments");
      revalidatePath("/dashboard");
      return { success: true };
    }

    const { doctor, procedure } = await validateAppointment({
      clinicId: session.user.clinic.id,
      patientId: parsedInput.patientId,
      doctorId: parsedInput.doctorId,
      date: parsedInput.date,
      type: parsedInput.type,
      procedureId: parsedInput.procedureId,
    });

    // Create new appointment
    const [appointment] = await db
      .insert(appointmentsTable)
      .values({
        patientId: parsedInput.patientId,
        doctorId: parsedInput.doctorId,
        clinicId: session.user.clinic.id,
        date: parsedInput.date,
        type: parsedInput.type,
        procedureId: parsedInput.type === "procedure" ? parsedInput.procedureId : null,
        appointmentPriceInCents:
          procedure?.priceInCents ?? doctor!.appointmentPriceInCents,
      })
      .returning({
        id: appointmentsTable.id,
      });

    await syncAppointmentToGoogleCalendar({
      appointmentId: appointment.id,
    });

    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    return { success: true };
  });
