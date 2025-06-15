"use client";

import { PlusIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { createAppointment } from "@/actions/create-appointment";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Doctor, Patient } from "../types";
import { AppointmentForm } from "./appointment-form";

interface AddAppointmentButtonProps {
  patients: Patient[];
  doctors: Doctor[];
}

export function AddAppointmentButton({
  patients,
  doctors,
}: AddAppointmentButtonProps) {
  const [open, setOpen] = useState(false);

  const { execute } = useAction(createAppointment, {
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!");
      setOpen(false);
    },
    onError: (error) => {
      const errorMessage =
        error.error.serverError || "Erro ao criar agendamento";
      toast.error(errorMessage);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon /> Novo Agendamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>
        <AppointmentForm
          patients={patients}
          doctors={doctors}
          onSubmit={async (values) => {
            await execute(values);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
