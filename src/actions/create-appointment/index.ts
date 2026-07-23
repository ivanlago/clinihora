"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { appointmentsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { syncAppointmentToGoogleCalendar } from "@/lib/google-calendar";
import { actionClient } from "@/lib/safe-action";

import { validateAppointment } from "../_helpers/validate-appointment";

const createAppointmentSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().uuid().nullable().optional(),
  date: z.date(),
  appointmentPriceInCents: z.number().min(1),
  type: z.enum(["consultation", "procedure"]),
  procedureId: z.string().uuid().nullable().optional(),
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

    const { doctor, procedure } = await validateAppointment({
      clinicId: session.user.clinic.id,
      patientId: parsedInput.patientId,
      doctorId: parsedInput.doctorId,
      date: parsedInput.date,
      type: parsedInput.type,
      procedureId: parsedInput.procedureId,
    });

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
