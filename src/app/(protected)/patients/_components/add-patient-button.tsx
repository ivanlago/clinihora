"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { PatientForm } from "./patient-form";

export function AddPatientButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Novo Paciente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Paciente</DialogTitle>
        </DialogHeader>
        <PatientForm
          onSuccess={() => {
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
