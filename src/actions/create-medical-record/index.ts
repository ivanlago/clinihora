"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db";
import { doctorsTable, medicalRecordsTable, patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { actionClient } from "@/lib/safe-action";

const schema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid("Selecione um profissional"),
  type: z.enum(["consultation", "anamnesis", "evolution", "prescription", "exam"]),
  title: z.string().trim().min(1, "Título é obrigatório").max(160),
  notes: z.string().trim().min(1, "Observações são obrigatórias"),
  recordedAt: z.coerce.date(),
});

export type CreateMedicalRecordSchema = z.infer<typeof schema>;

export const createMedicalRecord = actionClient.schema(schema).action(async ({ parsedInput }) => {
  const session = await auth.api.getSession({ headers: await headers() });
  const clinicId = session?.user?.clinic?.id;
  if (!session?.user || !clinicId) throw new Error("Unauthorized");

  const [patient, doctor] = await Promise.all([
    db.query.patientsTable.findFirst({
      where: and(eq(patientsTable.id, parsedInput.patientId), eq(patientsTable.clinicId, clinicId)),
    }),
    db.query.doctorsTable.findFirst({
      where: and(eq(doctorsTable.id, parsedInput.doctorId), eq(doctorsTable.clinicId, clinicId)),
    }),
  ]);

  if (!patient || !doctor) throw new Error("Paciente ou profissional inválido");

  await db.insert(medicalRecordsTable).values({ ...parsedInput, clinicId });
  revalidatePath(`/patients/${parsedInput.patientId}`);
  return { success: true };
});
