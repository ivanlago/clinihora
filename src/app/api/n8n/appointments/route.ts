import { and, asc, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { validateAppointment } from "@/actions/_helpers/validate-appointment";
import { db } from "@/db";
import { appointmentsTable } from "@/db/schema";
import { clinicTime } from "@/lib/clinic-time";
import { syncAppointmentToGoogleCalendar } from "@/lib/google-calendar";
import { handleN8nApiError, requireN8nClinicAuth } from "@/lib/n8n-api";

const listAppointmentsSearchSchema = z.object({
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
  from: z.string().datetime({ offset: true }).optional(),
});

const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid().nullable().optional(),
  date: z.string().datetime({ offset: true }),
  type: z.enum(["consultation", "procedure"]).default("consultation"),
  procedureId: z.string().uuid().nullable().optional(),
}).superRefine((input, context) => {
  if (input.type === "procedure" && !input.procedureId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["procedureId"],
      message: "procedureId é obrigatório para procedimentos",
    });
  }
});

export const GET = async (request: NextRequest) => {
  const auth = requireN8nClinicAuth(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const input = listAppointmentsSearchSchema.parse({
      patientId: request.nextUrl.searchParams.get("patientId") ?? undefined,
      doctorId: request.nextUrl.searchParams.get("doctorId") ?? undefined,
      from: request.nextUrl.searchParams.get("from") ?? undefined,
    });
    const appointments = await db.query.appointmentsTable.findMany({
      where: and(
        eq(appointmentsTable.clinicId, auth.clinicId),
        input.patientId
          ? eq(appointmentsTable.patientId, input.patientId)
          : undefined,
        input.doctorId
          ? eq(appointmentsTable.doctorId, input.doctorId)
          : undefined,
        gte(appointmentsTable.date, input.from ? new Date(input.from) : new Date())
      ),
      orderBy: asc(appointmentsTable.date),
      with: {
        doctor: true,
        patient: true,
        procedure: true,
      },
    });

    return NextResponse.json({
      appointments,
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};

export const POST = async (request: NextRequest) => {
  const auth = requireN8nClinicAuth(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const input = createAppointmentSchema.parse(await request.json());
    const date = new Date(input.date);
    const { doctor, patient, procedure } = await validateAppointment({
      clinicId: auth.clinicId,
      patientId: input.patientId,
      doctorId: input.doctorId,
      date,
      type: input.type,
      procedureId: input.procedureId,
    });
    const [appointment] = await db
      .insert(appointmentsTable)
      .values({
        clinicId: auth.clinicId,
        patientId: input.patientId,
        doctorId: input.doctorId,
        date,
        type: input.type,
        procedureId: input.type === "procedure" ? input.procedureId : null,
        appointmentPriceInCents:
          procedure?.priceInCents ?? doctor!.appointmentPriceInCents,
      })
      .returning();

    if (doctor) {
      await syncAppointmentToGoogleCalendar({
        appointmentId: appointment.id,
      });
    }

    revalidatePath("/appointments");
    revalidatePath("/dashboard");

    return NextResponse.json({
      appointment: {
        ...appointment,
        doctor,
        patient,
        procedure,
      },
      notification: {
        patient: {
          phone: patient.phone,
          email: patient.email,
          message:
            input.type === "procedure"
              ? `Procedimento ${procedure?.name}${doctor ? ` marcado com ${doctor.name}` : " marcado"} em ${clinicTime(date).format("DD/MM/YYYY [às] HH:mm")}.`
              : `Consulta marcada com ${doctor!.name} em ${clinicTime(date).format("DD/MM/YYYY [às] HH:mm")}.`,
        },
        doctor: doctor ? {
          phone: doctor.phone,
          email: doctor.email,
          message:
            input.type === "procedure"
              ? `Novo procedimento ${procedure?.name} com ${patient.name} em ${clinicTime(date).format("DD/MM/YYYY [às] HH:mm")}.`
              : `Nova consulta com ${patient.name} em ${clinicTime(date).format("DD/MM/YYYY [às] HH:mm")}.`,
        } : null,
      },
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
