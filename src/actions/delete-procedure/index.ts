"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { proceduresTable } from "@/db/schema";
import { auth } from "@/lib/auth";

export const deleteProcedure = async (procedureId: string) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!session.user.clinic?.id) {
    throw new Error("Clinic not found");
  }

  const procedure = await db.query.proceduresTable.findFirst({
    where: and(
      eq(proceduresTable.id, procedureId),
      eq(proceduresTable.clinicId, session.user.clinic.id)
    ),
  });

  if (!procedure) {
    throw new Error("Procedure not found");
  }

  await db
    .delete(proceduresTable)
    .where(
      and(
        eq(proceduresTable.id, procedureId),
        eq(proceduresTable.clinicId, session.user.clinic.id)
      )
    );

  revalidatePath("/procedures");
};
