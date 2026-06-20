import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { doctorsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { getGoogleCalendarAuthorizationUrl } from "@/lib/google-calendar";

export const GET = async (request: NextRequest) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.clinic) {
    return NextResponse.redirect(new URL("/authentication", request.url));
  }

  const doctorId = request.nextUrl.searchParams.get("doctorId");

  if (!doctorId) {
    return NextResponse.redirect(new URL("/doctors", request.url));
  }

  const doctor = await db.query.doctorsTable.findFirst({
    where: and(
      eq(doctorsTable.id, doctorId),
      eq(doctorsTable.clinicId, session.user.clinic.id)
    ),
  });

  if (!doctor) {
    return NextResponse.redirect(new URL("/doctors", request.url));
  }

  return NextResponse.redirect(
    getGoogleCalendarAuthorizationUrl({
      doctorId,
    })
  );
};
