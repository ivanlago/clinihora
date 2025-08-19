import { z } from "zod";

export const upsertDoctorSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, { message: "O nome é obrigatório" }),
    specialty: z
      .string()
      .trim()
      .min(1, { message: "A especialidade é obrigatório" }),
    appointmentPriceInCents: z
      .number()
      .min(1, { message: "O preço da consulta é obrigatório" }),
    availableDays: z.array(z.object({
      dayOfWeek: z.number().min(0).max(6),
      fromTime: z.string().min(1, { message: "A hora inicial do dia é obrigatório" }),
      toTime: z.string().min(1, { message: "A hora final do dia é obrigatório" }),
    }))
    .min(1, { message: "Selecione pelo menos um dia da semana" })
    .refine(
      (days) => {
        return days.every(day => day.fromTime < day.toTime);
      },
      {
        message: "O horário final não pode ser anterior ou igual ao horário inicial",
        path: ["availableDays"],
      }
    ),
});

export type UpsertDoctorSchema = z.infer<typeof upsertDoctorSchema>;
