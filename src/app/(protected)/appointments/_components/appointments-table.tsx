"use client";

import { DataTable } from "@/components/ui/data-table";

import { AppointmentWithRelations, Doctor, Patient, Procedure } from "../types";
import { appointmentsTableColumns } from "./table-columns";

interface AppointmentsTableProps {
  appointments: AppointmentWithRelations[];
  patients: Patient[];
  doctors: Doctor[];
  procedures: Procedure[];
}

export function AppointmentsTable({
  appointments,
  patients,
  doctors,
  procedures,
}: AppointmentsTableProps) {
  const columns = appointmentsTableColumns({ patients, doctors, procedures });

  return <DataTable columns={columns} data={appointments} />;
}
