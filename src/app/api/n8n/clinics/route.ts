import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { handleN8nApiError, requireN8nApiAuth } from "@/lib/n8n-api";

export const GET = async (request: NextRequest) => {
  const auth = requireN8nApiAuth(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const clinics = await db.query.clinicsTable.findMany({
      columns: {
        id: true,
        name: true,
      },
      orderBy: (table, { asc }) => asc(table.name),
    });

    return NextResponse.json({
      clinics,
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
