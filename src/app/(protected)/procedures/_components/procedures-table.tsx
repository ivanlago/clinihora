"use client";

import { DataTable } from "@/components/ui/data-table";
import { doctorsTable, proceduresTable } from "@/db/schema";

import { proceduresTableColumns } from "./table-columns";

type Doctor = typeof doctorsTable.$inferSelect;
type Procedure = typeof proceduresTable.$inferSelect & {
  doctorIds: string[];
};

interface ProceduresTableProps {
  procedures: Procedure[];
  doctors: Doctor[];
}

export function ProceduresTable({
  procedures,
  doctors,
}: ProceduresTableProps) {
  const columns = proceduresTableColumns({ doctors });

  return <DataTable columns={columns} data={procedures} />;
}
