"use server";

import dayjs from "dayjs";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { appointmentsTable, doctorsTable, patientsTable, proceduresTable } from "@/db/schema";

interface ValidateAppointmentParams {
  appointmentId?: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
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
    db.query.doctorsTable.findFirst({
      where: and(
        eq(doctorsTable.id, doctorId),
        eq(doctorsTable.clinicId, clinicId)
      ),
    }),
    procedureId
      ? db.query.proceduresTable.findFirst({
          where: and(eq(proceduresTable.id, procedureId), eq(proceduresTable.clinicId, clinicId), eq(proceduresTable.isActive, true)),
        })
      : Promise.resolve(undefined),
  ]);

  if (!patient) {
    throw new Error("Paciente não encontrado");
  }

  if (!doctor) {
    throw new Error("Médico não encontrado");
  }
  if (type === "procedure" && !procedure) {
    throw new Error("Procedimento não encontrado ou inativo");
  }

  const selectedDay = doctor.availableDays?.find(
    (day) => day.dayOfWeek === dayjs(date).day()
  );

  if (!selectedDay) {
    throw new Error("Médico indisponível nesta data");
  }

  const selectedTime = dayjs(date).format("HH:mm:ss");
  if (selectedTime < selectedDay.fromTime || selectedTime > selectedDay.toTime) {
    throw new Error("Horário fora da disponibilidade do médico");
  }

  const sameTimeCondition = and(
    eq(appointmentsTable.clinicId, clinicId),
    eq(appointmentsTable.doctorId, doctorId),
    eq(appointmentsTable.date, date),
    appointmentId ? ne(appointmentsTable.id, appointmentId) : undefined
  );

  const conflictingAppointment = await db.query.appointmentsTable.findFirst({
    where: sameTimeCondition,
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
