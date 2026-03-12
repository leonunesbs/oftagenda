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

export const n8nPhoneLinkRequestSchema = z.object({
  phone: z.string().trim().min(8).max(30),
  email: z.string().trim().email().max(320),
});

export const n8nPatientContextSchema = z.object({
  phone: z.string().trim().min(8).max(30),
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

const n8nResumoDateSchema = z.preprocess(
  (value) => normalizeDateInput(value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
);

const n8nResumoTimeSchema = z.preprocess(
  (value) => normalizeTimeInput(value),
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
);

const n8nResumoLocationSchema = z.preprocess(
  (value) => normalizeLocationInput(value),
  bookingLocationSchema,
);

export const n8nResumoLinkSchema = bookingCheckoutSchema
  .omit({ location: true, date: true, time: true })
  .extend({
    location: n8nResumoLocationSchema,
    date: n8nResumoDateSchema,
    time: n8nResumoTimeSchema,
  })
  .extend({
  payment: z.enum(["cancelled"]).optional(),
  source: z.string().trim().max(80).optional(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(160).optional(),
  utmContent: z.string().trim().max(160).optional(),
  utmTerm: z.string().trim().max(160).optional(),
  gclid: z.string().trim().max(240).optional(),
  gbraid: z.string().trim().max(240).optional(),
  wbraid: z.string().trim().max(240).optional(),
  fbclid: z.string().trim().max(240).optional(),
  msclkid: z.string().trim().max(240).optional(),
});

function normalizeLocationInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function normalizeDateInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month}-${day}`;
  }

  const brMatch = trimmed.match(/^(\d{2})[/-](\d{2})(?:[/-](\d{4}))?$/);
  if (!brMatch) {
    return trimmed;
  }
  const [, day, month, year] = brMatch;
  const resolvedYear = year ?? String(new Date().getFullYear());
  return `${resolvedYear}-${month}-${day}`;
}

function normalizeTimeInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim().replaceAll("h", ":");
  if (!trimmed) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return trimmed;
  }
  const hours = match[1];
  const minutes = match[2];
  if (!hours || !minutes) {
    return trimmed;
  }
  return `${hours.padStart(2, "0")}:${minutes}`;
}
