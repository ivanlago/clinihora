"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/safe-action";

const patientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  sex: z.enum(["male", "female"], {
    required_error: "Sexo é obrigatório",
  }),
});

export type UpsertPatientSchema = z.infer<typeof patientSchema>;

export const upsertPatient = actionClient
  .schema(patientSchema)
  .action(async ({ parsedInput }) => {
    try {
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
        // Update existing patient
        await db
          .update(patientsTable)
          .set({
            name: parsedInput.name,
            email: parsedInput.email,
            phone: parsedInput.phone,
            sex: parsedInput.sex,
            updatedAt: new Date(),
          })
          .where(eq(patientsTable.id, parsedInput.id));

        revalidatePath("/patients");
        revalidatePath("/dashboard");
        return { success: true };
      }

      // Create new patient
      await db.insert(patientsTable).values({
        clinicId: session.user.clinic.id,
        name: parsedInput.name,
        email: parsedInput.email,
        phone: parsedInput.phone,
        sex: parsedInput.sex,
      });

      revalidatePath("/patients");
      revalidatePath("/dashboard");
      return { success: true };
    } catch (error) {
      console.error("Error upserting patient:", error);
      return { success: false, error: "Erro ao salvar paciente" };
    }
  });
