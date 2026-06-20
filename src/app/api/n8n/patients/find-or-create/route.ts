import { and, eq, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { patientsTable } from "@/db/schema";
import { handleN8nApiError, requireN8nClinicAuth } from "@/lib/n8n-api";

const findOrCreatePatientSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  sex: z.enum(["male", "female"]),
});

export const POST = async (request: NextRequest) => {
  const auth = requireN8nClinicAuth(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const input = findOrCreatePatientSchema.parse(await request.json());
    const patient = await db.query.patientsTable.findFirst({
      where: and(
        eq(patientsTable.clinicId, auth.clinicId),
        or(eq(patientsTable.phone, input.phone), eq(patientsTable.email, input.email))
      ),
    });

    if (patient) {
      return NextResponse.json({
        patient,
        created: false,
      });
    }

    const [createdPatient] = await db
      .insert(patientsTable)
      .values({
        clinicId: auth.clinicId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        sex: input.sex,
      })
      .returning();

    return NextResponse.json({
      patient: createdPatient,
      created: true,
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
