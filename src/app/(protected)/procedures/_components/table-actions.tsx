"use client";

import { MoreVerticalIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { doctorsTable, proceduresTable } from "@/db/schema";

import { ProcedureForm } from "./procedure-form";

interface ProcedureTableActionsProps {
  procedure: typeof proceduresTable.$inferSelect & { doctorIds: string[] };
  doctors: (typeof doctorsTable.$inferSelect)[];
}

export default function ProcedureTableActions({
  procedure,
  doctors,
}: ProcedureTableActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVerticalIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      {isDialogOpen && (
        <ProcedureForm
          key={`procedure-form-${procedure.id}-${isDialogOpen}`}
          procedure={procedure}
          doctors={doctors}
          onSuccess={() => setIsDialogOpen(false)}
        />
      )}
    </Dialog>
  );
}
