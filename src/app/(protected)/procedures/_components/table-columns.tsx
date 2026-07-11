"use client";

import { ColumnDef } from "@tanstack/react-table";

import { formatCurrencyInCents } from "@/_helpers/currency";
import { Badge } from "@/components/ui/badge";
import { proceduresTable } from "@/db/schema";

import TableActions from "./table-actions";

type Procedure = typeof proceduresTable.$inferSelect;

export const proceduresTableColumns: ColumnDef<Procedure>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Nome",
  },
  {
    id: "description",
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => row.original.description || "-",
  },
  {
    id: "durationInMinutes",
    accessorKey: "durationInMinutes",
    header: "Duração",
    cell: ({ row }) => `${row.original.durationInMinutes} min`,
  },
  {
    id: "priceInCents",
    accessorKey: "priceInCents",
    header: "Preço",
    cell: ({ row }) => formatCurrencyInCents(row.original.priceInCents),
  },
  {
    id: "isActive",
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? "default" : "secondary"}>
        {row.original.isActive ? "Ativo" : "Inativo"}
      </Badge>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <TableActions procedure={row.original} />,
  },
];
