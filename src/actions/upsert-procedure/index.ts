"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { proceduresTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/safe-action";

const procedureSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  priceInCents: z.number().min(0, "Preço deve ser maior ou igual a zero"),
  durationInMinutes: z
    .number()
    .int("Duração deve ser um número inteiro")
    .min(5, "Duração deve ser de pelo menos 5 minutos"),
  isActive: z.boolean(),
});

export type UpsertProcedureSchema = z.infer<typeof procedureSchema>;

export const upsertProcedure = actionClient
  .schema(procedureSchema)
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

      const values = {
        name: parsedInput.name,
        description: parsedInput.description || null,
        priceInCents: parsedInput.priceInCents,
        durationInMinutes: parsedInput.durationInMinutes,
        isActive: parsedInput.isActive,
        updatedAt: new Date(),
      };

      if (parsedInput.id) {
        const procedure = await db.query.proceduresTable.findFirst({
          where: and(
            eq(proceduresTable.id, parsedInput.id),
            eq(proceduresTable.clinicId, session.user.clinic.id)
          ),
        });

        if (!procedure) {
          throw new Error("Procedure not found");
        }

        await db
          .update(proceduresTable)
          .set(values)
          .where(
            and(
              eq(proceduresTable.id, parsedInput.id),
              eq(proceduresTable.clinicId, session.user.clinic.id)
            )
          );

        revalidatePath("/procedures");
        return { success: true };
      }

      await db.insert(proceduresTable).values({
        clinicId: session.user.clinic.id,
        name: parsedInput.name,
        description: parsedInput.description || null,
        priceInCents: parsedInput.priceInCents,
        durationInMinutes: parsedInput.durationInMinutes,
        isActive: parsedInput.isActive,
      });

      revalidatePath("/procedures");
      return { success: true };
    } catch (error) {
      console.error("Error upserting procedure:", error);
      return { success: false, error: "Erro ao salvar procedimento" };
    }
  });
