"use server";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

// import { redirect } from "next/navigation";
import { db } from "@/db";
import { doctorsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/safe-action";

import { upsertDoctorSchema } from "./schema";

dayjs.extend(utc);

export const upsertDoctor = actionClient
  .schema(upsertDoctorSchema)
  .action(async ({ parsedInput }) => {
    // Os horários agora são armazenados diretamente no availableDays

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    if (!session.user.clinic?.id) {
      throw new Error("Clinic not found");
    }

    if (parsedInput.id) {
      const doctor = await db.query.doctorsTable.findFirst({
        where: and(
          eq(doctorsTable.id, parsedInput.id),
          eq(doctorsTable.clinicId, session.user.clinic.id)
        ),
      });

      if (!doctor) {
        throw new Error("Doctor not found");
      }

      await db
        .update(doctorsTable)
        .set({
          name: parsedInput.name,
          email: parsedInput.email,
          phone: parsedInput.phone,
          specialty: parsedInput.specialty,
          appointmentPriceInCents: parsedInput.appointmentPriceInCents,
          availableDays: parsedInput.availableDays,
          updatedAt: new Date(),
        })
        .where(eq(doctorsTable.id, parsedInput.id));

      revalidatePath("/doctors");
      revalidatePath("/dashboard");
      return;
    }

    await db.insert(doctorsTable).values({
      name: parsedInput.name,
      email: parsedInput.email,
      phone: parsedInput.phone,
      specialty: parsedInput.specialty,
      appointmentPriceInCents: parsedInput.appointmentPriceInCents,
      clinicId: session.user.clinic.id,
      availableDays: parsedInput.availableDays,
    });

    revalidatePath("/doctors");
    revalidatePath("/dashboard");
  });
