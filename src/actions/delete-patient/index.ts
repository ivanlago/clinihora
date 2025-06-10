"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { patientsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

export const deletePatient = async (patientId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!session.user.clinic?.id) {
    throw new Error("Clinic not found");
  }

  const patient = await db.query.patientsTable.findFirst({
    where: eq(patientsTable.id, patientId),
  });

  if (!patient) {
    throw new Error("Patient not found");
  }

  if (patient.clinicId !== session.user.clinic?.id) {
    throw new Error("Patient not found");
  }

  await db.delete(patientsTable).where(eq(patientsTable.id, patientId));
  revalidatePath("/patients");
};
