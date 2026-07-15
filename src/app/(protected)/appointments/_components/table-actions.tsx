"use client";

import { MoreVerticalIcon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

import { deleteAppointment } from "@/actions/delete-appointment";
import { upsertAppointment } from "@/actions/upsert-appointment";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AppointmentWithRelations } from "../types";
import { AppointmentForm } from "./appointment-form";

interface AppointmentTableActionsProps {
  appointment: AppointmentWithRelations;
  patients: AppointmentWithRelations["patient"][];
  doctors: AppointmentWithRelations["doctor"][];
  procedures: NonNullable<AppointmentWithRelations["procedure"]>[];
}

export function AppointmentTableActions({
  appointment,
  patients,
  doctors,
  procedures,
}: AppointmentTableActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { executeAsync: executeDelete } = useAction(deleteAppointment, {
    onSuccess: () => {
      toast.success("Agendamento excluído com sucesso!");
    },
    onError: (error) => {
      toast.error(error.error.serverError || "Erro ao excluir agendamento");
    },
  });

  const { executeAsync: executeUpsert, isPending: isSaving } = useAction(
    upsertAppointment,
    {
    onSuccess: () => {
      toast.success("Agendamento salvo com sucesso!");
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.error.serverError || "Erro ao salvar agendamento");
    },
    }
  );

  const handleDelete = async () => {
    if (confirm("Tem certeza que deseja excluir este agendamento?")) {
      await executeDelete({ id: appointment.id });
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem>Editar</DropdownMenuItem>
          </DialogTrigger>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleDelete}
          >
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isDialogOpen && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
          </DialogHeader>
          <AppointmentForm
            key={`appointment-form-${appointment.id}-${isDialogOpen}`}
            patients={patients}
            doctors={doctors}
            procedures={procedures}
            isSubmitting={isSaving}
            defaultValues={{
              id: appointment.id,
              patientId: appointment.patientId,
              doctorId: appointment.doctorId,
              date: appointment.date,
              appointmentPriceInCents: appointment.appointmentPriceInCents,
              type: appointment.type,
              procedureId: appointment.procedureId,
            }}
            onSubmit={async (values) => {
              try {
                await executeUpsert(values);
              } catch (error) {
                console.error("Error saving appointment:", error);
                toast.error("Erro ao salvar agendamento");
              }
            }}
          />
        </DialogContent>
      )}
    </Dialog>
  );
}
