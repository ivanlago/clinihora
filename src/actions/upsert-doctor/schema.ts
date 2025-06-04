import { z } from "zod";

export const upsertDoctorSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, { message: "O nome é obrigatório" }),
    specialty: z
      .string()
      .trim()
      .min(1, { message: "A especialidade é obrigatório" }),
    appointmentPriceInCents: z
      .number()
      .min(1, { message: "O preço da consulta é obrigatório" }),
    availableFromWeekDay: z.number().min(0).max(6),
    availableToWeekDay: z.number().min(0).max(6),
    availableFromTime: z
      .string()
      .min(1, { message: "A hora inicial do dia é obrigatório" }),
    availableToTime: z
      .string()
      .min(1, { message: "A hora final do dia é obrigatório" }),
  })
  .refine(
    (data) => {
      return data.availableFromTime < data.availableToTime;
    },
    {
      message:
        "O horário final não pode ser anterior ou igual ao horário inicial",
      path: ["availableToTime"],
    }
  );

export type UpsertDoctorSchema = z.infer<typeof upsertDoctorSchema>;
