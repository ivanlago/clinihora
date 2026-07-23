"use server";

import { and, eq, ne } from "drizzle-orm";

import {
  appointmentIntervalsOverlap,
  clockTimeToMinutes,
  DEFAULT_APPOINTMENT_DURATION_IN_MINUTES,
} from "@/_helpers/appointment-time";
import { db } from "@/db";
import { appointmentsTable, doctorsTable, patientsTable, proceduresTable } from "@/db/schema";
import { clinicTime } from "@/lib/clinic-time";

interface ValidateAppointmentParams {
  appointmentId?: string;
  clinicId: string;
  patientId: string;
  doctorId?: string | null;
  date: Date;
  type: "consultation" | "procedure";
  procedureId?: string | null;
}

export async function validateAppointment({
  appointmentId,
  clinicId,
  patientId,
  doctorId,
  date,
  type,
  procedureId,
}: ValidateAppointmentParams) {
  const [patient, doctor, procedure] = await Promise.all([
    db.query.patientsTable.findFirst({
      where: and(
        eq(patientsTable.id, patientId),
        eq(patientsTable.clinicId, clinicId)
      ),
    }),
    doctorId
      ? db.query.doctorsTable.findFirst({
          where: and(
            eq(doctorsTable.id, doctorId),
            eq(doctorsTable.clinicId, clinicId)
          ),
        })
      : Promise.resolve(undefined),
    procedureId
      ? db.query.proceduresTable.findFirst({
          where: and(eq(proceduresTable.id, procedureId), eq(proceduresTable.clinicId, clinicId), eq(proceduresTable.isActive, true)),
          with: { proceduresToDoctors: true },
        })
      : Promise.resolve(undefined),
  ]);

  if (!patient) {
    throw new Error("Paciente não encontrado");
  }

  if (type === "procedure" && !procedure) {
    throw new Error("Procedimento não encontrado ou inativo");
  }
  if (type === "consultation" && !doctor) {
    throw new Error("Profissional é obrigatório para consultas");
  }

  if (type === "procedure" && procedure) {
    const allowedDoctorIds = procedure.proceduresToDoctors.map(
      (item) => item.doctorId
    );
    if (allowedDoctorIds.length === 0 && doctorId) {
      throw new Error("Este procedimento não utiliza profissional");
    }
    if (allowedDoctorIds.length > 0 && !doctorId) {
      throw new Error("Selecione um profissional para este procedimento");
    }
    if (doctorId && !allowedDoctorIds.includes(doctorId)) {
      throw new Error("Profissional não habilitado para este procedimento");
    }
    if (doctorId && !doctor) {
      throw new Error("Profissional não encontrado");
    }
  }

  if (!doctor || !doctorId) {
    return { doctor: null, patient, procedure };
  }

  const selectedDay = doctor.availableDays?.find(
    (day) => day.dayOfWeek === clinicTime(date).day()
  );

  if (!selectedDay) {
    throw new Error("Médico indisponível nesta data");
  }

  const selectedTime = clinicTime(date).format("HH:mm:ss");
  if (selectedTime < selectedDay.fromTime || selectedTime > selectedDay.toTime) {
    throw new Error("Horário fora da disponibilidade do médico");
  }

  const appointments = await db.query.appointmentsTable.findMany({
    where: and(
      eq(appointmentsTable.clinicId, clinicId),
      eq(appointmentsTable.doctorId, doctorId),
      appointmentId ? ne(appointmentsTable.id, appointmentId) : undefined
    ),
    with: {
      procedure: {
        columns: {
          durationInMinutes: true,
        },
      },
    },
  });

  const selectedDate = clinicTime(date).format("YYYY-MM-DD");
  const selectedStart = clockTimeToMinutes(selectedTime);
  const selectedDuration =
    procedure?.durationInMinutes ?? DEFAULT_APPOINTMENT_DURATION_IN_MINUTES;
  const conflictingAppointment = appointments.find((appointment) => {
    if (clinicTime(appointment.date).format("YYYY-MM-DD") !== selectedDate) {
      return false;
    }

    return appointmentIntervalsOverlap({
      firstStart: selectedStart,
      firstDuration: selectedDuration,
      secondStart: clockTimeToMinutes(
        clinicTime(appointment.date).format("HH:mm:ss")
      ),
      secondDuration:
        appointment.procedure?.durationInMinutes ??
        DEFAULT_APPOINTMENT_DURATION_IN_MINUTES,
    });
  });

  if (conflictingAppointment) {
    throw new Error("Horário já ocupado");
  }

  return {
    doctor,
    patient,
    procedure,
  };
}
