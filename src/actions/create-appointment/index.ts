"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { appointmentsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/safe-action";

const createAppointmentSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  date: z.date(),
  appointmentPriceInCents: z.number().min(1),
});

export type CreateAppointmentSchema = z.infer<typeof createAppointmentSchema>;

export const createAppointment = actionClient
  .schema(createAppointmentSchema)
  .action(async ({ parsedInput }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.clinic) {
      throw new Error("Unauthorized");
    }

    await db.insert(appointmentsTable).values({
      patientId: parsedInput.patientId,
      doctorId: parsedInput.doctorId,
      clinicId: session.user.clinic.id,
      date: parsedInput.date,
      appointmentPriceInCents: parsedInput.appointmentPriceInCents,
    });

    revalidatePath("/appointments");
    revalidatePath("/dashboard");
    return { success: true };
  });
