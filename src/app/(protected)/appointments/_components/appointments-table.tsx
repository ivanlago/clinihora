"use client";

import { DataTable } from "@/components/ui/data-table";

import { AppointmentWithRelations, Doctor, Patient } from "../types";
import { appointmentsTableColumns } from "./table-columns";

interface AppointmentsTableProps {
  appointments: AppointmentWithRelations[];
  patients: Patient[];
  doctors: Doctor[];
}

export function AppointmentsTable({
  appointments,
  patients,
  doctors,
}: AppointmentsTableProps) {
  const columns = appointmentsTableColumns({ patients, doctors });

  return <DataTable columns={columns} data={appointments} />;
}
