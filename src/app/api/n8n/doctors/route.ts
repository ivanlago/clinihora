import { and, eq, ilike } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { doctorsTable } from "@/db/schema";
import { handleN8nApiError, requireN8nClinicAuth } from "@/lib/n8n-api";

export const GET = async (request: NextRequest) => {
  const auth = requireN8nClinicAuth(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const specialty = request.nextUrl.searchParams.get("specialty");
    const doctors = await db.query.doctorsTable.findMany({
      where: and(
        eq(doctorsTable.clinicId, auth.clinicId),
        specialty ? ilike(doctorsTable.specialty, `%${specialty}%`) : undefined
      ),
      columns: {
        id: true,
        name: true,
        specialty: true,
        email: true,
        phone: true,
        appointmentPriceInCents: true,
        availableDays: true,
      },
      with: {
        googleCalendarAccount: {
          columns: {
            googleEmail: true,
          },
        },
      },
    });

    return NextResponse.json({
      doctors,
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
