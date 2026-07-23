"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { doctorsTable } from "@/db/schema";

import { ProcedureForm } from "./procedure-form";

export function AddProcedureButton({
  doctors,
}: {
  doctors: (typeof doctorsTable.$inferSelect)[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Novo Procedimento
        </Button>
      </DialogTrigger>
      {open && (
        <ProcedureForm doctors={doctors} onSuccess={() => setOpen(false)} />
      )}
    </Dialog>
  );
}
