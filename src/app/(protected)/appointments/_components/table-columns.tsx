"use client";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

import { AppointmentWithRelations } from "../types";
import { AppointmentTableActions } from "./table-actions";

interface TableColumnsProps {
  patients: AppointmentWithRelations["patient"][];
  doctors: AppointmentWithRelations["doctor"][];
}

export const createAppointmentsTableColumns = ({
  patients,
  doctors,
}: TableColumnsProps): ColumnDef<AppointmentWithRelations>[] => [
  {
    accessorKey: "patient.name",
    header: "Paciente",
  },
  {
    accessorKey: "doctor.name",
    header: "Médico",
  },
  {
    accessorKey: "date",
    header: "Data e Hora",
    cell: ({ row }) => {
      const date = row.getValue("date") as Date;
      return format(date, "PPP 'às' HH:mm", { locale: ptBR });
    },
  },
  {
    accessorKey: "appointmentPriceInCents",
    header: "Valor",
    cell: ({ row }) => {
      const price = row.getValue("appointmentPriceInCents") as number;
      return formatCurrency(price);
    },
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const date = row.getValue("date") as Date;
      const now = new Date();

      if (date < now) {
        return <Badge variant="secondary">Realizado</Badge>;
      }

      return <Badge>Agendado</Badge>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <AppointmentTableActions
          appointment={appointment}
          patients={patients}
          doctors={doctors}
        />
      );
    },
  },
];
