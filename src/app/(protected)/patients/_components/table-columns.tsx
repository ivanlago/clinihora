"use client";

import { ColumnDef } from "@tanstack/react-table";

import { patientsTable } from "@/db/schema";

import TableActions from "./table-actions";

type Patient = typeof patientsTable.$inferSelect;

export const patientsTableColumns: ColumnDef<Patient>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Nome",
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
  },
  {
    id: "phone",
    accessorKey: "phone",
    header: "Telefone",
    cell: (params) => {
      const patient = params.row.original;
      const phoneNumber = patient.phone;
      if (!phoneNumber) return "";
      const formatted = phoneNumber.replace(
        /(\d{2})(\d{5})(\d{4})/,
        "($1) $2-$3"
      );
      return formatted;
    },
  },
  {
    id: "sex",
    accessorKey: "sex",
    header: "Sexo",
    cell: ({ row }) => {
      return (
        <div>{row.original.sex === "male" ? "Masculino" : "Feminino"}</div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const patient = row.original;
      return <TableActions patient={patient} />;
    },
  },
];
