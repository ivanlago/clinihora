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
  doctors: NonNullable<AppointmentWithRelations["doctor"]>[];
  procedures: NonNullable<AppointmentWithRelations["procedure"]>[];
}

export const appointmentsTableColumns = ({
  patients,
  doctors,
  procedures,
}: TableColumnsProps): ColumnDef<AppointmentWithRelations>[] => [
  {
    id: "type",
    header: "Tipo",
    cell: ({ row }) => <Badge variant="outline">{row.original.type === "procedure" ? row.original.procedure?.name ?? "Procedimento" : "Consulta"}</Badge>,
  },
  {
    accessorKey: "patient.name",
    header: "Paciente",
  },
  {
    accessorKey: "doctor.name",
    header: "Médico",
    cell: ({ row }) => row.original.doctor?.name ?? "Sem profissional",
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
    cell: ({ row }) => row.original.doctor?.specialty ?? "-",
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
          procedures={procedures}
        />
      );
    },
  },
];
