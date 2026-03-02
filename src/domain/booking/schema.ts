import { z } from "zod/v4";

export const bookingLocationSchema = z.enum([
  "fortaleza",
  "sao_domingos_do_maranhao",
  "fortuna",
]);

export const bookingPeriodSchema = z.enum(["manha", "tarde", "noite", "qualquer"]);

export const bookingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email(),
  location: bookingLocationSchema,
  preferredPeriod: bookingPeriodSchema,
  reason: z.string().trim().max(120).optional(),
});

export type BookingPayload = z.infer<typeof bookingSchema>;
