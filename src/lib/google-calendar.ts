import dayjs from "dayjs";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  appointmentsTable,
  doctorGoogleCalendarAccountsTable,
} from "@/db/schema";

const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";
const GOOGLE_EMAIL_SCOPE = "https://www.googleapis.com/auth/userinfo.email";
const APPOINTMENT_DURATION_IN_MINUTES = 30;

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
};

type GoogleUserInfoResponse = {
  email: string;
};

type GoogleCalendarEventResponse = {
  id: string;
};

type AppointmentWithRelations = typeof appointmentsTable.$inferSelect & {
  patient: {
    name: string;
    email: string;
    phone: string;
  };
  doctor: {
    id: string;
    name: string;
    email: string | null;
    specialty: string;
  };
};

const getGoogleOAuthConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL;

  if (!clientId || !clientSecret || !appUrl) {
    throw new Error("Google Calendar OAuth is not configured");
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${appUrl}/api/google-calendar/callback`,
  };
};

const getAccessTokenExpirationDate = (expiresIn?: number) => {
  if (!expiresIn) return null;

  return dayjs().add(expiresIn, "second").toDate();
};

const assertGoogleResponse = async (response: Response) => {
  if (response.ok) return;

  const error = await response.text();
  throw new Error(
    error || `Google Calendar request failed with status ${response.status}`
  );
};

export const getGoogleCalendarAuthorizationUrl = ({
  doctorId,
}: {
  doctorId: string;
}) => {
  const { clientId, redirectUri } = getGoogleOAuthConfig();
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set(
    "scope",
    [GOOGLE_EMAIL_SCOPE, GOOGLE_CALENDAR_SCOPE].join(" ")
  );
  authorizationUrl.searchParams.set("access_type", "offline");
  authorizationUrl.searchParams.set("include_granted_scopes", "false");
  authorizationUrl.searchParams.set("prompt", "consent");
  authorizationUrl.searchParams.set(
    "state",
    Buffer.from(JSON.stringify({ doctorId })).toString("base64url")
  );

  return authorizationUrl.toString();
};

export const parseGoogleCalendarAuthorizationState = (state: string) => {
  const parsedState = JSON.parse(
    Buffer.from(state, "base64url").toString("utf8")
  ) as { doctorId?: string };

  if (!parsedState.doctorId) {
    throw new Error("Invalid Google Calendar state");
  }

  return {
    doctorId: parsedState.doctorId,
  };
};

export const exchangeGoogleCalendarCode = async (code: string) => {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  await assertGoogleResponse(response);

  return (await response.json()) as GoogleTokenResponse;
};

export const hasGoogleCalendarEventsScope = (scope?: string) => {
  return scope?.split(" ").includes(GOOGLE_CALENDAR_SCOPE) ?? false;
};

export const getGoogleUserInfo = async (accessToken: string) => {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  await assertGoogleResponse(response);

  return (await response.json()) as GoogleUserInfoResponse;
};

const refreshGoogleCalendarAccessToken = async ({
  account,
}: {
  account: typeof doctorGoogleCalendarAccountsTable.$inferSelect;
}) => {
  if (
    account.accessTokenExpiresAt &&
    dayjs(account.accessTokenExpiresAt).isAfter(dayjs().add(1, "minute"))
  ) {
    return account.accessToken;
  }

  if (!account.refreshToken) {
    return account.accessToken;
  }

  const { clientId, clientSecret } = getGoogleOAuthConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  await assertGoogleResponse(response);

  const tokens = (await response.json()) as GoogleTokenResponse;

  await db
    .update(doctorGoogleCalendarAccountsTable)
    .set({
      accessToken: tokens.access_token,
      accessTokenExpiresAt: getAccessTokenExpirationDate(tokens.expires_in),
      scope: tokens.scope ?? account.scope,
      updatedAt: new Date(),
    })
    .where(eq(doctorGoogleCalendarAccountsTable.id, account.id));

  return tokens.access_token;
};

const getAppointmentEventPayload = (appointment: AppointmentWithRelations) => {
  const startDate = appointment.date;
  const endDate = dayjs(startDate).add(APPOINTMENT_DURATION_IN_MINUTES, "minute");
  const patient = appointment.patient;
  const doctor = appointment.doctor;

  return {
    summary: `Consulta - ${patient.name}`,
    description: [
      `Paciente: ${patient.name}`,
      `Telefone: ${patient.phone}`,
      `Email: ${patient.email}`,
      `Médico: ${doctor.name}`,
      `Especialidade: ${doctor.specialty}`,
    ].join("\n"),
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "America/Bahia",
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "America/Bahia",
    },
    attendees: [doctor.email, patient.email]
      .filter(Boolean)
      .map((email) => ({ email })),
  };
};

const updateAppointmentGoogleSyncStatus = async ({
  appointmentId,
  eventId,
  calendarId,
  status,
  error,
}: {
  appointmentId: string;
  eventId?: string | null;
  calendarId?: string | null;
  status: "synced" | "not_connected" | "error" | "deleted";
  error?: string | null;
}) => {
  await db
    .update(appointmentsTable)
    .set({
      googleCalendarEventId: eventId,
      googleCalendarId: calendarId,
      googleCalendarSyncStatus: status,
      googleCalendarSyncError: error,
      updatedAt: new Date(),
    })
    .where(eq(appointmentsTable.id, appointmentId));
};

export const upsertDoctorGoogleCalendarAccount = async ({
  doctorId,
  tokens,
}: {
  doctorId: string;
  tokens: GoogleTokenResponse;
}) => {
  const userInfo = await getGoogleUserInfo(tokens.access_token);
  const existingAccount = await db.query.doctorGoogleCalendarAccountsTable.findFirst({
    where: eq(doctorGoogleCalendarAccountsTable.doctorId, doctorId),
  });

  if (existingAccount) {
    await db
      .update(doctorGoogleCalendarAccountsTable)
      .set({
        googleEmail: userInfo.email,
        calendarId: "primary",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? existingAccount.refreshToken,
        accessTokenExpiresAt: getAccessTokenExpirationDate(tokens.expires_in),
        scope: tokens.scope,
        updatedAt: new Date(),
      })
      .where(eq(doctorGoogleCalendarAccountsTable.id, existingAccount.id));
    return;
  }

  await db.insert(doctorGoogleCalendarAccountsTable).values({
    doctorId,
    googleEmail: userInfo.email,
    calendarId: "primary",
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessTokenExpiresAt: getAccessTokenExpirationDate(tokens.expires_in),
    scope: tokens.scope,
  });
};

export const syncAppointmentToGoogleCalendar = async ({
  appointmentId,
}: {
  appointmentId: string;
}) => {
  const appointment = await db.query.appointmentsTable.findFirst({
    where: eq(appointmentsTable.id, appointmentId),
    with: {
      patient: true,
      doctor: true,
    },
  });

  if (!appointment) return;

  const account = await db.query.doctorGoogleCalendarAccountsTable.findFirst({
    where: eq(doctorGoogleCalendarAccountsTable.doctorId, appointment.doctorId),
  });

  if (!account) {
    await updateAppointmentGoogleSyncStatus({
      appointmentId,
      eventId: null,
      calendarId: null,
      status: "not_connected",
      error: null,
    });
    return;
  }

  try {
    const accessToken = await refreshGoogleCalendarAccessToken({ account });
    const payload = getAppointmentEventPayload(appointment);
    const eventId = appointment.googleCalendarEventId;
    const shouldUpdateEvent =
      eventId && appointment.googleCalendarId === account.calendarId;
    const url = shouldUpdateEvent
      ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          account.calendarId
        )}/events/${encodeURIComponent(eventId)}`
      : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          account.calendarId
        )}/events`;

    const response = await fetch(url, {
      method: shouldUpdateEvent ? "PATCH" : "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    await assertGoogleResponse(response);

    const event = (await response.json()) as GoogleCalendarEventResponse;

    await updateAppointmentGoogleSyncStatus({
      appointmentId,
      eventId: event.id,
      calendarId: account.calendarId,
      status: "synced",
      error: null,
    });
  } catch (error) {
    await updateAppointmentGoogleSyncStatus({
      appointmentId,
      eventId: appointment.googleCalendarEventId,
      calendarId: appointment.googleCalendarId,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown sync error",
    });
  }
};

export const deleteAppointmentFromGoogleCalendar = async ({
  appointmentId,
  doctorId,
  eventId,
  calendarId,
}: {
  appointmentId: string;
  doctorId: string;
  eventId: string | null;
  calendarId: string | null;
}) => {
  if (!eventId || !calendarId) return;

  const account = await db.query.doctorGoogleCalendarAccountsTable.findFirst({
    where: and(
      eq(doctorGoogleCalendarAccountsTable.doctorId, doctorId),
      eq(doctorGoogleCalendarAccountsTable.calendarId, calendarId)
    ),
  });

  if (!account) return;

  try {
    const accessToken = await refreshGoogleCalendarAccessToken({ account });
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status !== 404) {
      await assertGoogleResponse(response);
    }

    await updateAppointmentGoogleSyncStatus({
      appointmentId,
      eventId: null,
      calendarId: null,
      status: "deleted",
      error: null,
    });
  } catch {
    // Appointment deletion must not be blocked by an external calendar failure.
  }
};
