"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { doctorsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

export const deleteDoctor = async (doctorId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!session.user.clinic?.id) {
    throw new Error("Clinic not found");
  }

  const doctor = await db.query.doctorsTable.findFirst({
    where: eq(doctorsTable.id, doctorId),
  });

  if (!doctor) {
    throw new Error("Doctor not found");
  }

  if (doctor.clinicId !== session.user.clinic?.id) {
    throw new Error("Doctor not found");
  }

  await db.delete(doctorsTable).where(eq(doctorsTable.id, doctorId));
  revalidatePath("/doctors");
};
