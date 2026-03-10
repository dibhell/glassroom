import { z } from "zod";

export const sessionEnergyValues = ["focus", "calm", "hype"] as const;

export const sessionDraftSchema = z.object({
  title: z.string().trim().min(3, "Tytuł musi mieć min. 3 znaki."),
  host: z.string().trim().min(2, "Prowadzący musi mieć min. 2 znaki."),
  startsAt: z
    .string()
    .datetime({ offset: true, error: "Podaj poprawną datę sesji." }),
  durationMinutes: z
    .number()
    .int("Czas trwania musi być liczbą całkowitą.")
    .min(15, "Minimum to 15 minut.")
    .max(240, "Maksimum to 240 minut."),
  notes: z
    .string()
    .trim()
    .max(240, "Notatki mogą mieć maksymalnie 240 znaków.")
    .optional()
    .transform((value) => value ?? ""),
  energy: z.enum(sessionEnergyValues),
});
