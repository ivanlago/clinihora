"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import {
  doctorsTable,
  proceduresTable,
  proceduresToDoctorsTable,
} from "@/db/schema";
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
  doctorIds: z.array(z.string().uuid()).default([]),
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

      const doctors =
        parsedInput.doctorIds.length > 0
          ? await db.query.doctorsTable.findMany({
              where: and(
                eq(doctorsTable.clinicId, session.user.clinic.id),
                // IDs are checked below to avoid accepting professionals from another clinic.
              ),
            })
          : [];
      const validDoctorIds = new Set(doctors.map((doctor) => doctor.id));
      if (parsedInput.doctorIds.some((id) => !validDoctorIds.has(id))) {
        throw new Error("Professional not found");
      }

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

        await db.transaction(async (tx) => {
          await tx
            .delete(proceduresToDoctorsTable)
            .where(eq(proceduresToDoctorsTable.procedureId, parsedInput.id!));
          if (parsedInput.doctorIds.length) {
            await tx.insert(proceduresToDoctorsTable).values(
              parsedInput.doctorIds.map((doctorId) => ({
                procedureId: parsedInput.id!,
                doctorId,
                clinicId: session.user.clinic!.id,
              }))
            );
          }
        });

        revalidatePath("/procedures");
        return { success: true };
      }

      const [procedure] = await db.insert(proceduresTable).values({
        clinicId: session.user.clinic.id,
        name: parsedInput.name,
        description: parsedInput.description || null,
        priceInCents: parsedInput.priceInCents,
        durationInMinutes: parsedInput.durationInMinutes,
        isActive: parsedInput.isActive,
      }).returning({ id: proceduresTable.id });
      if (parsedInput.doctorIds.length) {
        await db.insert(proceduresToDoctorsTable).values(
          parsedInput.doctorIds.map((doctorId) => ({
            procedureId: procedure.id,
            doctorId,
            clinicId: session.user.clinic!.id,
          }))
        );
      }

      revalidatePath("/procedures");
      return { success: true };
    } catch (error) {
      console.error("Error upserting procedure:", error);
      return { success: false, error: "Erro ao salvar procedimento" };
    }
  });
