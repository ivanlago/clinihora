import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { validateAppointment } from "@/actions/_helpers/validate-appointment";
import { db } from "@/db";
import { appointmentsTable } from "@/db/schema";
import { clinicTime } from "@/lib/clinic-time";
import {
  deleteAppointmentFromGoogleCalendar,
  syncAppointmentToGoogleCalendar,
} from "@/lib/google-calendar";
import { handleN8nApiError, requireN8nClinicAuth } from "@/lib/n8n-api";

const updateAppointmentSchema = z.object({
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().nullable().optional(),
  date: z.string().datetime({ offset: true }).optional(),
});

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export const PATCH = async (request: NextRequest, { params }: Params) => {
  const auth = requireN8nClinicAuth(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const input = updateAppointmentSchema.parse(await request.json());
    const appointment = await db.query.appointmentsTable.findFirst({
      where: eq(appointmentsTable.id, id),
    });

    if (!appointment || appointment.clinicId !== auth.clinicId) {
      throw new Error("Agendamento não encontrado");
    }

    const patientId = input.patientId ?? appointment.patientId;
    const doctorId =
      input.doctorId !== undefined ? input.doctorId : appointment.doctorId;
    const date = input.date ? new Date(input.date) : appointment.date;
    const { doctor, patient, procedure } = await validateAppointment({
      appointmentId: appointment.id,
      clinicId: auth.clinicId,
      patientId,
      doctorId,
      date,
      type: appointment.type,
      procedureId: appointment.procedureId,
    });

    if (appointment.doctorId !== doctorId && appointment.doctorId) {
      await deleteAppointmentFromGoogleCalendar({
        appointmentId: appointment.id,
          doctorId: appointment.doctorId,
        eventId: appointment.googleCalendarEventId,
        calendarId: appointment.googleCalendarId,
      });
    }

    const [updatedAppointment] = await db
      .update(appointmentsTable)
      .set({
        patientId,
        doctorId,
        date,
        appointmentPriceInCents:
          procedure?.priceInCents ?? doctor!.appointmentPriceInCents,
        updatedAt: new Date(),
      })
      .where(eq(appointmentsTable.id, appointment.id))
      .returning();

    await syncAppointmentToGoogleCalendar({
      appointmentId: appointment.id,
    });

    revalidatePath("/appointments");
    revalidatePath("/dashboard");

    return NextResponse.json({
      appointment: {
        ...updatedAppointment,
        doctor,
        patient,
        procedure,
      },
      notification: {
        patient: {
          phone: patient.phone,
          email: patient.email,
          message:
            appointment.type === "procedure"
              ? `Procedimento ${procedure?.name}${doctor ? ` remarcado com ${doctor.name}` : " remarcado"} para ${clinicTime(date).format("DD/MM/YYYY [às] HH:mm")}.`
              : `Consulta remarcada com ${doctor!.name} para ${clinicTime(date).format("DD/MM/YYYY [às] HH:mm")}.`,
        },
        doctor: doctor ? {
          phone: doctor.phone,
          email: doctor.email,
          message:
            appointment.type === "procedure"
              ? `Procedimento ${procedure?.name} de ${patient.name} remarcado para ${clinicTime(date).format("DD/MM/YYYY [às] HH:mm")}.`
              : `Consulta de ${patient.name} remarcada para ${clinicTime(date).format("DD/MM/YYYY [às] HH:mm")}.`,
        } : null,
      },
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const auth = requireN8nClinicAuth(request);

  if ("error" in auth) {
    return auth.error;
  }

  try {
    const { id } = await params;
    const appointment = await db.query.appointmentsTable.findFirst({
      where: eq(appointmentsTable.id, id),
      with: {
        doctor: true,
        patient: true,
        procedure: true,
      },
    });

    if (!appointment || appointment.clinicId !== auth.clinicId) {
      throw new Error("Agendamento não encontrado");
    }

    if (appointment.doctorId) {
      await deleteAppointmentFromGoogleCalendar({
        appointmentId: appointment.id,
        doctorId: appointment.doctorId,
        eventId: appointment.googleCalendarEventId,
        calendarId: appointment.googleCalendarId,
      });
    }

    await db.delete(appointmentsTable).where(eq(appointmentsTable.id, id));

    revalidatePath("/appointments");
    revalidatePath("/dashboard");

    return NextResponse.json({
      success: true,
      notification: {
        patient: {
          phone: appointment.patient.phone,
          email: appointment.patient.email,
          message:
            appointment.type === "procedure"
              ? `Procedimento ${appointment.procedure?.name}${appointment.doctor ? ` com ${appointment.doctor.name}` : ""} em ${clinicTime(appointment.date).format("DD/MM/YYYY [às] HH:mm")} cancelado.`
              : `Consulta com ${appointment.doctor!.name} em ${clinicTime(appointment.date).format("DD/MM/YYYY [às] HH:mm")} cancelada.`,
        },
        doctor: appointment.doctor ? {
          phone: appointment.doctor.phone,
          email: appointment.doctor.email,
          message:
            appointment.type === "procedure"
              ? `Procedimento ${appointment.procedure?.name} de ${appointment.patient.name} em ${clinicTime(appointment.date).format("DD/MM/YYYY [às] HH:mm")} cancelado.`
              : `Consulta de ${appointment.patient.name} em ${clinicTime(appointment.date).format("DD/MM/YYYY [às] HH:mm")} cancelada.`,
        } : null,
      },
    });
  } catch (error) {
    return handleN8nApiError(error);
  }
};
