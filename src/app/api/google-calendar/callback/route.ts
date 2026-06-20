import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { doctorsTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  exchangeGoogleCalendarCode,
  hasGoogleCalendarEventsScope,
  parseGoogleCalendarAuthorizationState,
  upsertDoctorGoogleCalendarAccount,
} from "@/lib/google-calendar";

export const GET = async (request: NextRequest) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.clinic) {
      return NextResponse.redirect(new URL("/authentication", request.url));
    }

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(new URL("/doctors", request.url));
    }

    const { doctorId } = parseGoogleCalendarAuthorizationState(state);
    const doctor = await db.query.doctorsTable.findFirst({
      where: and(
        eq(doctorsTable.id, doctorId),
        eq(doctorsTable.clinicId, session.user.clinic.id)
      ),
    });

    if (!doctor) {
      return NextResponse.redirect(new URL("/doctors", request.url));
    }

    const tokens = await exchangeGoogleCalendarCode(code);

    if (!hasGoogleCalendarEventsScope(tokens.scope)) {
      throw new Error(
        `Google did not grant Calendar Events scope. Granted scopes: ${tokens.scope ?? "none"}`
      );
    }

    await upsertDoctorGoogleCalendarAccount({
      doctorId,
      tokens,
    });

    revalidatePath("/doctors");

    return NextResponse.redirect(new URL("/doctors", request.url));
  } catch (error) {
    console.error("Google Calendar callback failed", error);
    return NextResponse.redirect(
      new URL("/doctors?googleCalendar=error", request.url)
    );
  }
};
