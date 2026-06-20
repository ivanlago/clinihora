"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { Loader2 } from "lucide-react";
// import { isRedirectError } from "next/dist/client/components/redirect-error";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { NumericFormat, PatternFormat } from "react-number-format";
import { toast } from "sonner";
import { z } from "zod";

import { deleteDoctor } from "@/actions/delete-doctor";
import { upsertDoctor } from "@/actions/upsert-doctor";
import { upsertDoctorSchema } from "@/actions/upsert-doctor/schema";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
import { Checkbox } from "@/components/ui/checkbox";
// import { createDoctor } from "@/actions/create-doctor";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { doctorsTable } from "@/db/schema";

import { medicalSpecialties } from "../_constants";

dayjs.extend(utc);

interface DoctorFormProps {
  doctor?: typeof doctorsTable.$inferSelect;
  onSuccess?: () => void;
}

export default function DoctorForm({ doctor, onSuccess }: DoctorFormProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const form = useForm<z.infer<typeof upsertDoctorSchema>>({
    shouldUnregister: true,
    resolver: zodResolver(upsertDoctorSchema),
    defaultValues: {
      name: doctor?.name ?? "",
      email: doctor?.email ?? "",
      phone: doctor?.phone ?? "",
      specialty: doctor?.specialty ?? "",
      appointmentPriceInCents: doctor?.appointmentPriceInCents
        ? doctor.appointmentPriceInCents / 100
        : 0,
      availableDays: doctor?.availableDays ?? [],
    },
  });

  // Reset form when doctor prop changes
  useEffect(() => {
    form.reset({
      name: doctor?.name ?? "",
      email: doctor?.email ?? "",
      phone: doctor?.phone ?? "",
      specialty: doctor?.specialty ?? "",
      appointmentPriceInCents: doctor?.appointmentPriceInCents
        ? doctor.appointmentPriceInCents / 100
        : 0,
      availableDays: doctor?.availableDays ?? [],
    });
  }, [doctor, form]);

  const upsertDoctorAction = useAction(upsertDoctor, {
    onSuccess: () => {
      form.reset();
      toast.success("Médico salvo com sucesso");
      onSuccess?.();
    },
    onError: () => {
      toast.error("Erro ao criar médico");
    },
  });

  async function onSubmit(values: z.infer<typeof upsertDoctorSchema>) {
    try {
      await upsertDoctorAction.executeAsync({
        ...values,
        id: doctor?.id,
        appointmentPriceInCents: values.appointmentPriceInCents * 100,
      });
    } catch (error) {
      console.error("Error saving doctor:", error);
      toast.error("Erro ao salvar médico");
    }
  }

  async function handleDeleteDoctor() {
    try {
      setIsDeleting(true);
      await deleteDoctor(doctor?.id ?? "");
      toast.success("Médico deletado com sucesso");
      setIsDeleting(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao deletar médico");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <DialogContent className="grid h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {doctor ? "Editar médico" : "Adicionar médico"}
          </DialogTitle>
          <DialogDescription>
            {doctor ? "Edite as informações do médico" : "Adicione um médico"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do médico" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Celular</FormLabel>
                      <FormControl>
                        <PatternFormat
                          customInput={Input}
                          format="(##) #####-####"
                          mask="_"
                          placeholder="(00) 00000-0000"
                          onValueChange={(values) => {
                            field.onChange(values.value);
                          }}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especialidade</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione uma especialidade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {medicalSpecialties.map((specialty) => (
                            <SelectItem
                              key={specialty.value}
                              value={specialty.value}
                            >
                              {specialty.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appointmentPriceInCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço da consulta</FormLabel>
                      <NumericFormat
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value.floatValue);
                        }}
                        decimalScale={2}
                        fixedDecimalScale
                        decimalSeparator=","
                        allowNegative={false}
                        allowLeadingZeros={false}
                        thousandSeparator="."
                        customInput={Input}
                        prefix="R$"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="availableDays"
                render={({ field }) => (
                  <div className="space-y-4">
                    <FormLabel>Disponibilidade por dia da semana</FormLabel>
                    <div className="grid gap-3">
                      {[
                        { value: 0, label: "Domingo" },
                        { value: 1, label: "Segunda" },
                        { value: 2, label: "Terça" },
                        { value: 3, label: "Quarta" },
                        { value: 4, label: "Quinta" },
                        { value: 5, label: "Sexta" },
                        { value: 6, label: "Sábado" },
                      ].map((day) => {
                        const dayConfig = field.value?.find(
                          (d) => d.dayOfWeek === day.value
                        );

                        return (
                          <div
                            key={day.value}
                            className="grid grid-cols-[minmax(5.75rem,1fr)_minmax(0,2fr)] items-end gap-2 rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-2 self-center">
                              <Checkbox
                                checked={!!dayConfig}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [
                                        ...field.value,
                                        {
                                          dayOfWeek: day.value,
                                          fromTime: "08:00:00",
                                          toTime: "18:00:00",
                                        },
                                      ]
                                    : field.value.filter(
                                        (d) => d.dayOfWeek !== day.value
                                      );
                                  field.onChange(newValue);
                                }}
                              />
                              <FormLabel className="m-0">
                                {day.label}
                              </FormLabel>
                            </div>
                            {dayConfig && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <FormLabel className="text-sm">
                                    Início
                                  </FormLabel>
                                  <Select
                                    value={dayConfig.fromTime}
                                    onValueChange={(value) => {
                                      const newValue = field.value.map((d) =>
                                        d.dayOfWeek === day.value
                                          ? { ...d, fromTime: value }
                                          : d
                                      );
                                      field.onChange(newValue);
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectLabel>Manhã</SelectLabel>
                                        {[...Array(16)].map((_, i) => {
                                          const hour = 5 + Math.floor(i / 2);
                                          const minute =
                                            i % 2 === 0 ? "00" : "30";
                                          const time = `${hour
                                            .toString()
                                            .padStart(2, "0")}:${minute}:00`;
                                          return (
                                            <SelectItem key={time} value={time}>
                                              {time.slice(0, 5)}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectGroup>
                                      <SelectGroup>
                                        <SelectLabel>Tarde</SelectLabel>
                                        {[...Array(12)].map((_, i) => {
                                          const hour = 13 + Math.floor(i / 2);
                                          const minute =
                                            i % 2 === 0 ? "00" : "30";
                                          const time = `${hour}:${minute}:00`;
                                          return (
                                            <SelectItem key={time} value={time}>
                                              {time.slice(0, 5)}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectGroup>
                                      <SelectGroup>
                                        <SelectLabel>Noite</SelectLabel>
                                        {[...Array(10)].map((_, i) => {
                                          const hour = 19 + Math.floor(i / 2);
                                          const minute =
                                            i % 2 === 0 ? "00" : "30";
                                          const time = `${hour}:${minute}:00`;
                                          return (
                                            <SelectItem key={time} value={time}>
                                              {time.slice(0, 5)}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <FormLabel className="text-sm">
                                    Fim
                                  </FormLabel>
                                  <Select
                                    value={dayConfig.toTime}
                                    onValueChange={(value) => {
                                      const newValue = field.value.map((d) =>
                                        d.dayOfWeek === day.value
                                          ? { ...d, toTime: value }
                                          : d
                                      );
                                      field.onChange(newValue);
                                    }}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectGroup>
                                        <SelectLabel>Manhã</SelectLabel>
                                        {[...Array(16)].map((_, i) => {
                                          const hour = 5 + Math.floor(i / 2);
                                          const minute =
                                            i % 2 === 0 ? "00" : "30";
                                          const time = `${hour
                                            .toString()
                                            .padStart(2, "0")}:${minute}:00`;
                                          return (
                                            <SelectItem key={time} value={time}>
                                              {time.slice(0, 5)}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectGroup>
                                      <SelectGroup>
                                        <SelectLabel>Tarde</SelectLabel>
                                        {[...Array(12)].map((_, i) => {
                                          const hour = 13 + Math.floor(i / 2);
                                          const minute =
                                            i % 2 === 0 ? "00" : "30";
                                          const time = `${hour}:${minute}:00`;
                                          return (
                                            <SelectItem key={time} value={time}>
                                              {time.slice(0, 5)}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectGroup>
                                      <SelectGroup>
                                        <SelectLabel>Noite</SelectLabel>
                                        {[...Array(10)].map((_, i) => {
                                          const hour = 19 + Math.floor(i / 2);
                                          const minute =
                                            i % 2 === 0 ? "00" : "30";
                                          const time = `${hour}:${minute}:00`;
                                          return (
                                            <SelectItem key={time} value={time}>
                                              {time.slice(0, 5)}
                                            </SelectItem>
                                          );
                                        })}
                                      </SelectGroup>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </div>
                )}
              />
            </div>

            <DialogFooter className="shrink-0 border-t bg-background pt-4 sm:justify-end">
              {doctor && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Deletar médico</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Tem certeza que deseja deletar o médico?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser revertida. Isso irá deletar o
                        médico e todas as consultas agendadas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteDoctor}
                        disabled={isDeleting}
                      >
                        {isDeleting && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Deletar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button type="submit" disabled={upsertDoctorAction.isPending}>
                {upsertDoctorAction.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {doctor ? "Salvar alterações" : "Adicionar médico"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </>
  );
}
