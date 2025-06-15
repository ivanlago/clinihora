"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

import { AppointmentWithRelations } from "../../appointments/types";

export const todayAppointmentsColumns: ColumnDef<AppointmentWithRelations>[] = [
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
    id: "specialty",
    accessorKey: "doctor.specialty",
    header: "Especialidade",
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
];
