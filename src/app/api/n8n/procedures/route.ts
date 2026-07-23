import { and, asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { proceduresTable } from "@/db/schema";
import { handleN8nApiError, requireN8nClinicAuth } from "@/lib/n8n-api";

export const GET = async (request: NextRequest) => {
  const auth = requireN8nClinicAuth(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const procedures = await db.query.proceduresTable.findMany({
      where: and(
        eq(proceduresTable.clinicId, auth.clinicId),
        eq(proceduresTable.isActive, true)
      ),
      orderBy: asc(proceduresTable.name),
      columns: {
        id: true,
        name: true,
        description: true,
        priceInCents: true,
        durationInMinutes: true,
      },
      with: {
        proceduresToDoctors: {
          with: { doctor: true },
        },
      },
    });

    return NextResponse.json({
      procedures: procedures.map((procedure) => ({
        ...procedure,
        requiresProfessional: procedure.proceduresToDoctors.length > 0,
        professionals: procedure.proceduresToDoctors.map(({ doctor }) => ({
          id: doctor.id,
          name: doctor.name,
          specialty: doctor.specialty,
        })),
        proceduresToDoctors: undefined,
      })),
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
