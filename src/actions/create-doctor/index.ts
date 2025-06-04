"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { doctorsTable } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function createDoctor(
  name: string,
  specialty: string,
  appointmentPriceInCents: number,
  availableFromWeekDay: number,
  availableToWeekDay: number,
  availableFromTime: string,
  availableToTime: string
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (!session.user.clinic?.id) {
    throw new Error("Clinic not found");
  }

  await db.insert(doctorsTable).values({
    clinicId: session.user.clinic?.id,
    name,
    specialty,
    appointmentPriceInCents,
    availableFromWeekDay,
    availableToWeekDay,
    availableFromTime,
    availableToTime,
  });
  redirect("/doctors");
}
