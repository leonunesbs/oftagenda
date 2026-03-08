import { z } from "zod/v4";

import { bookingCheckoutSchema, bookingLocationSchema } from "@/domain/booking/schema";

export const n8nAvailabilitySearchSchema = z.object({
  location: bookingLocationSchema,
  daysAhead: z.coerce.number().int().min(1).max(30).default(14),
});

export const n8nAppointmentLookupSchema = z.object({
  phone: z.string().trim().min(8).max(30),
  includeHistory: z.coerce.boolean().optional().default(false),
});

export const n8nCancelAppointmentSchema = z.object({
  appointmentId: z.string().trim().min(1),
  phone: z.string().trim().min(8).max(30),
  reason: z.string().trim().max(240).optional(),
});

export const n8nUpdateAppointmentStatusSchema = z.object({
  appointmentId: z.string().trim().min(1),
  phone: z.string().trim().min(8).max(30),
  status: z.enum(["confirmed", "rescheduled", "cancelled", "completed"]),
  reason: z.string().trim().max(240).optional(),
});

export const n8nResumoLinkSchema = bookingCheckoutSchema.extend({
  payment: z.enum(["cancelled"]).optional(),
  source: z.string().trim().max(80).optional(),
  waUserId: z.string().trim().min(3).max(120).optional(),
});
