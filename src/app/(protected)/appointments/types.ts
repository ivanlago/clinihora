import { InferSelectModel } from "drizzle-orm";

import { appointmentsTable, doctorsTable, patientsTable, proceduresTable } from "@/db/schema";

export type Appointment = InferSelectModel<typeof appointmentsTable>;
export type Patient = InferSelectModel<typeof patientsTable>;
export type Doctor = InferSelectModel<typeof doctorsTable>;
export type Procedure = InferSelectModel<typeof proceduresTable> & {
  doctorIds?: string[];
};

export type AppointmentWithRelations = Appointment & {
  patient: Patient;
  doctor: Doctor | null;
  procedure: Procedure | null;
};
