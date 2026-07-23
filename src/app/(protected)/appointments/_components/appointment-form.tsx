"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
// import { CalendarIcon } from "@radix-ui/react-icons";
import { format, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import dayjs from "dayjs";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { NumericFormat } from "react-number-format";
import { z } from "zod";

import { generateTimeSlots } from "@/_helpers/time";
import { getAvailableTimes } from "@/actions/get-available-times";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { Doctor, Patient, Procedure } from "../types";

const appointmentFormSchema = z.object({
  id: z.string().uuid().optional(),
  patientId: z.string().min(1, "Selecione um paciente"),
  doctorId: z.string().uuid().nullable().optional(),
  date: z.date({
    required_error: "Selecione uma data",
  }),
  time: z.string().min(1, "Selecione um horário"),
  appointmentPriceInCents: z.number().min(1, "Valor inválido"),
  type: z.enum(["consultation", "procedure"]),
  procedureId: z.string().uuid().nullable().optional(),
}).superRefine((input, context) => {
  if (input.type === "consultation" && !input.doctorId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["doctorId"],
      message: "Selecione um profissional",
    });
  }
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  patients: Patient[];
  doctors: Doctor[];
  procedures: Procedure[];
  onSubmit: (values: AppointmentFormValues) => Promise<void> | void;
  defaultValues?: Partial<AppointmentFormValues>;
  isSubmitting?: boolean;
}

export function AppointmentForm({
  patients,
  doctors,
  procedures,
  onSubmit,
  defaultValues,
  isSubmitting = false,
}: AppointmentFormProps) {
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      ...defaultValues,
      type: defaultValues?.type ?? "consultation",
      time: defaultValues?.date
        ? format(defaultValues.date, "HH:mm")
        : undefined,
      appointmentPriceInCents: defaultValues?.doctorId
        ? doctors.find((d) => d.id === defaultValues.doctorId)
            ?.appointmentPriceInCents
        : undefined,
    },
  });

  const selectedDoctorId = form.watch("doctorId");
  const selectedType = form.watch("type");
  const selectedDate = form.watch("date");
  const selectedProcedureId = form.watch("procedureId");
  const selectedProcedure = procedures.find(
    (procedure) => procedure.id === selectedProcedureId
  );
  const eligibleDoctors =
    selectedType === "procedure"
      ? doctors.filter((doctor) =>
          selectedProcedure?.doctorIds?.includes(doctor.id)
        )
      : doctors;
  const procedureWithoutProfessional =
    selectedType === "procedure" &&
    !!selectedProcedure &&
    (selectedProcedure.doctorIds?.length ?? 0) === 0;

  const { data: availableTimes } = useQuery({
    queryKey: [
      "available-times",
      selectedDate,
      selectedDoctorId,
      selectedProcedureId,
    ],
    queryFn: () =>
      getAvailableTimes({
        date: dayjs(selectedDate).format("YYYY-MM-DD"),
        doctorId: selectedDoctorId!,
        procedureId:
          selectedType === "procedure" ? selectedProcedureId : undefined,
      }),
    enabled: !!selectedDate && !!selectedDoctorId,
  });
  const displayedTimes = procedureWithoutProfessional
    ? generateTimeSlots().map((time) => ({
        value: time,
        label: time.substring(0, 5),
        available: true,
      }))
    : availableTimes?.data;

  const handleSubmit = async (values: AppointmentFormValues) => {
    // Combine date and time into a single datetime
    const [hours, minutes] = values.time.split(":").map(Number);
    const dateTime = setMinutes(setHours(values.date, hours), minutes);

    await onSubmit({
      ...values,
      date: dateTime,
      appointmentPriceInCents: Math.round(values.appointmentPriceInCents),
    });
  };

  const isDateAvailable = (date: Date) => {
    if (procedureWithoutProfessional) return true;
    if (!selectedDoctorId) return false;
    const selectedDoctor = doctors.find(
      (doctor) => doctor.id === selectedDoctorId
    );
    if (!selectedDoctor) return false;
    const dayOfWeek = date.getDay();
    return (
      selectedDoctor.availableDays?.some(
        (day) => day.dayOfWeek === dayOfWeek
      ) ?? false
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem><FormLabel>Tipo de agendamento</FormLabel>
            <Select value={field.value} onValueChange={(value: "consultation" | "procedure") => {
              field.onChange(value); form.setValue("procedureId", null);
              form.setValue("doctorId", null);
              const doctor = doctors.find((item) => item.id === form.getValues("doctorId"));
              form.setValue("appointmentPriceInCents", value === "consultation" ? doctor?.appointmentPriceInCents ?? 0 : 0);
            }}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="consultation">Consulta</SelectItem><SelectItem value="procedure">Procedimento</SelectItem></SelectContent></Select><FormMessage />
          </FormItem>
        )} />

        {selectedType === "procedure" && <FormField control={form.control} name="procedureId" render={({ field }) => (
          <FormItem><FormLabel>Procedimento</FormLabel>
            <Select value={field.value ?? undefined} onValueChange={(value) => { field.onChange(value); form.setValue("doctorId", null); form.setValue("time", ""); const procedure = procedures.find((item) => item.id === value); if (procedure) form.setValue("appointmentPriceInCents", procedure.priceInCents); }}><FormControl><SelectTrigger><SelectValue placeholder="Selecione um procedimento" /></SelectTrigger></FormControl><SelectContent>{procedures.filter((item) => item.isActive).map((procedure) => <SelectItem key={procedure.id} value={procedure.id}>{procedure.name}</SelectItem>)}</SelectContent></Select><FormMessage />
          </FormItem>
        )} />}
        <FormField
          control={form.control}
          name="patientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paciente</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um paciente" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
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
          name="doctorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profissional</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  const doctor = doctors.find((d) => d.id === value);
                  if (doctor && form.getValues("type") === "consultation") {
                    form.setValue(
                      "appointmentPriceInCents",
                      doctor.appointmentPriceInCents
                    );
                  }
                }}
                value={field.value ?? undefined}
                disabled={
                  selectedType === "procedure" &&
                  (!selectedProcedure || procedureWithoutProfessional)
                }
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        procedureWithoutProfessional
                          ? "Procedimento sem profissional"
                          : "Selecione um profissional"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {eligibleDoctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      {doctor.name}
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
              <FormLabel>Valor</FormLabel>
              <FormControl>
                <NumericFormat
                  value={field.value ? field.value / 100 : undefined}
                  onValueChange={(values) => {
                    field.onChange(
                      values.floatValue ? values.floatValue * 100 : undefined
                    );
                  }}
                  thousandSeparator="."
                  decimalSeparator=","
                  prefix="R$ "
                  decimalScale={2}
                  fixedDecimalScale
                  disabled={!selectedDoctorId}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={
                          (!selectedDoctorId && !procedureWithoutProfessional) ||
                          !form.watch("patientId")
                        }
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date() || !isDateAvailable(date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horário</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={!selectedDate}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um horário" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {displayedTimes?.map((time) => (
                      <SelectItem
                        key={time.value}
                        value={time.value}
                        disabled={!time.available}
                      >
                        {time.label} {!time.available && "(Indisponível)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || form.formState.isSubmitting}
        >
          {isSubmitting || form.formState.isSubmitting
            ? "Salvando..."
            : defaultValues?.id
              ? "Atualizar"
              : "Agendar"}
        </Button>
      </form>
    </Form>
  );
}
