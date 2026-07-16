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
    });

    return NextResponse.json({ procedures });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
