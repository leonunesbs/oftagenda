import { z } from "zod/v4";

export const bookingLocationSchema = z.string().trim().min(1).max(120);

export const bookingPeriodSchema = z.enum(["manha", "tarde", "noite", "qualquer"]);

export const bookingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email(),
  location: bookingLocationSchema,
  preferredPeriod: bookingPeriodSchema,
  reason: z.string().trim().max(120).optional(),
});

export const bookingCheckoutSchema = z.object({
  location: bookingLocationSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

export type BookingPayload = z.infer<typeof bookingSchema>;
export type BookingCheckoutPayload = z.infer<typeof bookingCheckoutSchema>;
