"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { appointmentsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/safe-action";

const upsertAppointmentSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  date: z.date(),
  appointmentPriceInCents: z.number().min(1),
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

      await db
        .update(appointmentsTable)
        .set({
          patientId: parsedInput.patientId,
          doctorId: parsedInput.doctorId,
          date: parsedInput.date,
          appointmentPriceInCents: parsedInput.appointmentPriceInCents,
          updatedAt: new Date(),
        })
        .where(eq(appointmentsTable.id, parsedInput.id));

      revalidatePath("/appointments");
      return { success: true };
    }

    // Create new appointment
    await db.insert(appointmentsTable).values({
      patientId: parsedInput.patientId,
      doctorId: parsedInput.doctorId,
      clinicId: session.user.clinic.id,
      date: parsedInput.date,
      appointmentPriceInCents: parsedInput.appointmentPriceInCents,
    });

    revalidatePath("/appointments");
    return { success: true };
  });
