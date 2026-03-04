import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";

const checkoutDraftSchema = {
  location: v.string(),
  date: v.string(),
  time: v.string(),
};

const webhookStatusValidator = v.union(
  v.literal("paid"),
  v.literal("failed"),
  v.literal("expired"),
  v.literal("refunded"),
);

export const createCheckoutDraft = mutation({
  args: checkoutDraftSchema,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const slotTimestamp = parseIsoDateAndTimeToTimestamp(args.date, args.time);

    const eventType = await resolveActiveEventType(ctx, args.location);
    const rawStripePriceId = eventType.stripePriceId?.trim() || readStripePriceIdFromEnv();
    const stripePriceId = normalizeStripePriceId(rawStripePriceId);
    const amountCentsFromEvent =
      normalizeAmountCents(eventType.priceCents) ??
      parseLegacyAmountCentsFromStripePriceId(rawStripePriceId);
    const amountCents = amountCentsFromEvent ?? (stripePriceId ? 1 : undefined);
    if (!eventType.availabilityId) {
      throw new Error("Evento sem disponibilidade configurada.");
    }
    if (!amountCents || amountCents <= 0) {
      throw new Error(
        "Evento sem valor válido para pagamento. Configure `priceCents` em centavos (ex.: 24700) no evento ou use um valor numérico válido no campo legado de preço.",
      );
    }

    await assertSlotIsAvailable(ctx, eventType, args.date, args.time);
    const endsAt = slotTimestamp + eventType.durationMinutes * 60_000;

    const existingReservations = await ctx.db
      .query("reservations")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .collect();
    const existingDraft = existingReservations.find(
      (item) =>
        item.eventTypeId === eventType._id &&
        item.startsAt === slotTimestamp &&
        item.status === "pending",
    );

    let reservationId: Id<"reservations">;
    if (existingDraft) {
      reservationId = existingDraft._id;
      await ctx.db.patch(existingDraft._id, {
        availabilityId: eventType.availabilityId,
        endsAt,
        notes: "Checkout Stripe pendente.",
        updatedAt: now,
      });
    } else {
      reservationId = await ctx.db.insert("reservations", {
        clerkUserId: identity.subject,
        eventTypeId: eventType._id,
        availabilityId: eventType.availabilityId,
        startsAt: slotTimestamp,
        endsAt,
        status: "pending",
        notes: "Checkout Stripe pendente.",
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingPayment = await ctx.db
      .query("payments")
      .withIndex("by_reservation_id", (q) => q.eq("reservationId", reservationId))
      .first();

    let paymentId: Id<"payments">;
    if (existingPayment && existingPayment.status === "pending") {
      paymentId = existingPayment._id;
      await ctx.db.patch(existingPayment._id, {
        amountCents,
        currency: "BRL",
        method: "card",
        status: "pending",
        externalId: undefined,
        notes: "Checkout Stripe iniciado.",
        updatedAt: now,
      });
    } else {
      paymentId = await ctx.db.insert("payments", {
        clerkUserId: identity.subject,
        reservationId,
        amountCents,
        currency: "BRL",
        method: "card",
        status: "pending",
        notes: "Checkout Stripe iniciado.",
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      reservationId,
      paymentId,
      stripePriceId,
      amountCents,
      currency: "BRL",
      eventTypeSlug: eventType.slug,
      eventTypeName: eventType.name ?? eventType.title,
      clerkUserId: identity.subject,
    };
  },
});

export const attachCheckoutSession = mutation({
  args: {
    reservationId: v.id("reservations"),
    paymentId: v.id("payments"),
    checkoutSessionId: v.string(),
    paymentIntentId: v.optional(v.string()),
    amountCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation || reservation.clerkUserId !== identity.subject) {
      throw new Error("Reserva não encontrada.");
    }
    const payment = await ctx.db.get(args.paymentId);
    if (!payment || payment.clerkUserId !== identity.subject) {
      throw new Error("Pagamento não encontrado.");
    }

    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      amountCents:
        typeof args.amountCents === "number" && Number.isFinite(args.amountCents) && args.amountCents > 0
          ? Math.round(args.amountCents)
          : payment.amountCents,
      externalId: args.checkoutSessionId.trim(),
      notes: args.paymentIntentId
        ? `Checkout Stripe iniciado (payment_intent: ${args.paymentIntentId}).`
        : "Checkout Stripe iniciado.",
      updatedAt: now,
    });
    await ctx.db.patch(args.reservationId, {
      notes: "Aguardando confirmação do pagamento Stripe.",
      updatedAt: now,
    });

    return { ok: true };
  },
});

export const releaseCheckoutDraft = mutation({
  args: {
    reservationId: v.id("reservations"),
    paymentId: v.id("payments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const reservation = await ctx.db.get(args.reservationId);
    const payment = await ctx.db.get(args.paymentId);
    if (!reservation || reservation.clerkUserId !== identity.subject) {
      throw new Error("Reserva não encontrada.");
    }
    if (!payment || payment.clerkUserId !== identity.subject) {
      throw new Error("Pagamento não encontrado.");
    }

    const now = Date.now();
    if (reservation.status === "pending") {
      await ctx.db.patch(reservation._id, {
        status: "cancelled",
        notes: args.reason?.trim() || "Checkout Stripe não concluído.",
        updatedAt: now,
      });
    }
    if (payment.status === "pending") {
      await ctx.db.patch(payment._id, {
        status: "failed",
        notes: args.reason?.trim() || "Checkout Stripe não concluído.",
        updatedAt: now,
      });
    }

    return { ok: true };
  },
});

export const reconcileStripeEvent = mutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    status: webhookStatusValidator,
    checkoutSessionId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    metadata: v.object({
      reservationId: v.optional(v.string()),
      paymentId: v.optional(v.string()),
      clerkUserId: v.optional(v.string()),
      location: v.optional(v.string()),
      date: v.optional(v.string()),
      time: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("stripe_webhook_events")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId.trim()))
      .first();
    if (existingEvent) {
      return { ok: true, deduplicated: true };
    }

    const now = Date.now();
    const payment = await findPaymentByWebhook(ctx, args.metadata.paymentId, args.checkoutSessionId);
    if (!payment) {
      await ctx.db.insert("stripe_webhook_events", {
        eventId: args.eventId.trim(),
        eventType: args.eventType.trim(),
        status: "ignored",
        details: "Pagamento não encontrado para o evento.",
        createdAt: now,
      });
      return { ok: true, ignored: true };
    }

    const reservation = payment.reservationId ? await ctx.db.get(payment.reservationId) : null;
    if (!reservation) {
      await ctx.db.insert("stripe_webhook_events", {
        eventId: args.eventId.trim(),
        eventType: args.eventType.trim(),
        paymentId: payment._id,
        status: "ignored",
        details: "Reserva não encontrada para o pagamento.",
        createdAt: now,
      });
      return { ok: true, ignored: true };
    }

    if (args.status === "paid") {
      await markAsPaid(ctx, payment, reservation, args, now);
    } else if (args.status === "refunded") {
      await markAsRefunded(ctx, payment, reservation, now);
    } else {
      await markAsFailedOrExpired(ctx, payment, reservation, args.status, now);
    }

    await ctx.db.insert("stripe_webhook_events", {
      eventId: args.eventId.trim(),
      eventType: args.eventType.trim(),
      paymentId: payment._id,
      reservationId: reservation._id,
      status: "processed",
      details: JSON.stringify({
        webhookStatus: args.status,
        checkoutSessionId: args.checkoutSessionId,
        paymentIntentId: args.paymentIntentId,
      }),
      createdAt: now,
    });

    return { ok: true };
  },
});

async function markAsPaid(
  ctx: MutationCtx,
  payment: Doc<"payments">,
  reservation: Doc<"reservations">,
  args: {
    eventId: string;
    checkoutSessionId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  },
  now: number,
) {
  const alreadyPaid = payment.status === "paid";
  await ctx.db.patch(payment._id, {
    status: "paid",
    externalId: args.checkoutSessionId ?? payment.externalId,
    lastStripeEventId: args.eventId.trim(),
    notes: "Pagamento confirmado via webhook Stripe.",
    updatedAt: now,
  });
  await ctx.db.patch(reservation._id, {
    status: "confirmed",
    notes: "Pagamento confirmado via Stripe.",
    updatedAt: now,
  });

  const eventType = await ctx.db.get(reservation.eventTypeId);
  if (!eventType) {
    throw new Error("Evento da reserva não encontrado.");
  }

  const patient = await findOrCreatePatient(
    ctx,
    reservation.clerkUserId,
    args.customerName?.trim() || "Paciente",
    args.customerPhone?.trim() || "Não informado",
    args.customerEmail?.trim() || "nao-informado@exemplo.com",
    now,
  );

  let appointmentId = reservation.appointmentId;
  if (appointmentId) {
    await ctx.db.patch(appointmentId, {
      patientId: patient._id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      location: eventType.location,
      eventTypeId: eventType._id,
      reservationId: reservation._id,
      preferredPeriod: inferPreferredPeriod(reservation.startsAt),
      status: "confirmed",
      scheduledFor: reservation.startsAt,
      consultationType: eventType.name ?? eventType.title ?? "Consulta oftalmologica",
      updatedAt: now,
    });
  } else {
    appointmentId = await ctx.db.insert("appointments", {
      clerkUserId: reservation.clerkUserId,
      patientId: patient._id,
      name: patient.name,
      phone: patient.phone,
      email: patient.email,
      location: eventType.location,
      eventTypeId: eventType._id,
      reservationId: reservation._id,
      preferredPeriod: inferPreferredPeriod(reservation.startsAt),
      status: "confirmed",
      requestedAt: now,
      scheduledFor: reservation.startsAt,
      consultationType: eventType.name ?? eventType.title ?? "Consulta oftalmologica",
      updatedAt: now,
    });
    await ctx.db.patch(reservation._id, {
      appointmentId,
      updatedAt: now,
    });
  }

  if (!alreadyPaid) {
    await ctx.db.insert("appointment_events", {
      appointmentId,
      clerkUserId: reservation.clerkUserId,
      eventType: "confirmed",
      notes: "Agendamento confirmado automaticamente após pagamento Stripe.",
      createdAt: now,
    });
  }
}

async function markAsFailedOrExpired(
  ctx: MutationCtx,
  payment: Doc<"payments">,
  reservation: Doc<"reservations">,
  status: "failed" | "expired",
  now: number,
) {
  if (payment.status === "paid" || payment.status === "refunded") {
    return;
  }
  await ctx.db.patch(payment._id, {
    status: "failed",
    notes: status === "expired" ? "Checkout expirado no Stripe." : "Pagamento falhou no Stripe.",
    updatedAt: now,
  });

  if (reservation.status === "pending") {
    await ctx.db.patch(reservation._id, {
      status: "cancelled",
      notes: status === "expired" ? "Reserva liberada por expiração do checkout." : "Reserva liberada por falha no pagamento.",
      updatedAt: now,
    });
  }
}

async function markAsRefunded(
  ctx: MutationCtx,
  payment: Doc<"payments">,
  reservation: Doc<"reservations">,
  now: number,
) {
  await ctx.db.patch(payment._id, {
    status: "refunded",
    notes: "Pagamento reembolsado via Stripe.",
    updatedAt: now,
  });

  await ctx.db.patch(reservation._id, {
    status: "cancelled",
    notes: "Reserva cancelada após reembolso.",
    updatedAt: now,
  });

  if (reservation.appointmentId) {
    await ctx.db.patch(reservation.appointmentId, {
      status: "cancelled",
      updatedAt: now,
    });
    await ctx.db.insert("appointment_events", {
      appointmentId: reservation.appointmentId,
      clerkUserId: reservation.clerkUserId,
      eventType: "cancelled",
      notes: "Agendamento cancelado após reembolso no Stripe.",
      createdAt: now,
    });
  }
}

async function findPaymentByWebhook(
  ctx: MutationCtx,
  metadataPaymentId: string | undefined,
  checkoutSessionId: string | undefined,
) {
  if (metadataPaymentId) {
    const fromMetadata = await ctx.db.get(metadataPaymentId as Id<"payments">);
    if (fromMetadata) {
      return fromMetadata;
    }
  }

  if (checkoutSessionId?.trim()) {
    const fromExternalId = await ctx.db
      .query("payments")
      .withIndex("by_external_id", (q) => q.eq("externalId", checkoutSessionId.trim()))
      .first();
    if (fromExternalId) {
      return fromExternalId;
    }
  }

  return null;
}

async function resolveActiveEventType(ctx: MutationCtx, location: string) {
  const normalizedInput = location.trim().toLowerCase();
  const activeEventTypes = await ctx.db
    .query("event_types")
    .withIndex("by_active", (q) => q.eq("active", true))
    .collect();

  const candidates = activeEventTypes.filter(
    (item) => item.slug.trim().toLowerCase() === normalizedInput,
  );

  if (candidates.length === 0) {
    throw new Error(`Evento selecionado não encontrado para slug "${location.trim()}".`);
  }
  if (candidates.length > 1) {
    throw new Error(
      `Mais de um evento ativo encontrado para slug "${location.trim()}". Mantenha apenas um evento ativo por slug.`,
    );
  }

  return candidates[0]!;
}

async function assertSlotIsAvailable(
  ctx: MutationCtx,
  eventType: Doc<"event_types">,
  isoDate: string,
  time: string,
) {
  if (!eventType.availabilityId) {
    throw new Error("Evento sem disponibilidade configurada.");
  }

  const referenceAvailability = await ctx.db.get(eventType.availabilityId);
  if (!referenceAvailability) {
    throw new Error("Disponibilidade base não encontrada.");
  }
  const groupName = resolveAvailabilityGroupName(referenceAvailability);
  const weekday = new Date(`${isoDate}T12:00:00`).getDay();
  if (Number.isNaN(weekday)) {
    throw new Error("Data inválida.");
  }
  if (!isValidTimeValue(time)) {
    throw new Error("Horário inválido.");
  }

  const [allAvailabilities, allOverrides, allReservations] = await Promise.all([
    ctx.db.query("availabilities").collect(),
    ctx.db.query("availability_overrides").collect(),
    ctx.db.query("reservations").collect(),
  ]);

  const groupAvailabilities = allAvailabilities.filter(
    (item) => item.status === "active" && resolveAvailabilityGroupName(item) === groupName,
  );
  if (groupAvailabilities.length === 0) {
    throw new Error("Sem disponibilidade ativa para o evento.");
  }

  const override = allOverrides.find((item) => item.groupName === groupName && item.date === isoDate);
  const availableSlots = new Set<string>();
  if (override) {
    if (!override.allDayUnavailable) {
      const activeSlots = override.slots.filter((slot) => slot.status === "active");
      for (const slot of activeSlots) {
        for (const generatedSlot of buildSlotsWithinRange(
          slot.startTime,
          slot.endTime,
          eventType.durationMinutes,
        )) {
          availableSlots.add(generatedSlot);
        }
      }
    }
  } else {
    const weekdaySlots = groupAvailabilities.filter((item) => item.weekday === weekday);
    for (const weeklySlot of weekdaySlots) {
      for (const generatedSlot of buildSlotsWithinRange(
        weeklySlot.startTime,
        weeklySlot.endTime,
        eventType.durationMinutes,
      )) {
        availableSlots.add(generatedSlot);
      }
    }
  }

  if (!availableSlots.has(time)) {
    throw new Error("Horário não está mais disponível para este evento.");
  }

  const activeReservations = allReservations.filter(
    (reservation) =>
      reservation.eventTypeId === eventType._id &&
      (reservation.status === "pending" || reservation.status === "confirmed"),
  );
  const reservedKeys = new Set<string>();
  for (const reservation of activeReservations) {
    const availability = allAvailabilities.find((item) => item._id === reservation.availabilityId);
    if (!availability) {
      continue;
    }
    const reservationGroup = resolveAvailabilityGroupName(availability);
    const dateKey = formatDateInTimezone(reservation.startsAt, availability.timezone);
    const timeKey = formatTimeInTimezone(reservation.startsAt, availability.timezone);
    reservedKeys.add(buildSlotKey(reservationGroup, dateKey, timeKey));
  }

  if (reservedKeys.has(buildSlotKey(groupName, isoDate, time))) {
    throw new Error("Este horário acabou de ser reservado. Escolha outro horário.");
  }
}

async function findOrCreatePatient(
  ctx: MutationCtx,
  clerkUserId: string,
  name: string,
  phone: string,
  email: string,
  now: number,
) {
  const existing = await ctx.db
    .query("patients")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      name,
      phone,
      email,
      updatedAt: now,
    });
    return existing;
  }

  const patientId: Id<"patients"> = await ctx.db.insert("patients", {
    clerkUserId,
    name,
    phone,
    email,
    createdAt: now,
    updatedAt: now,
  });
  const patient = await ctx.db.get(patientId);
  if (!patient) {
    throw new Error("Falha ao criar paciente.");
  }
  return patient;
}

function resolveAvailabilityGroupName(availability: { name?: string; _id?: unknown } | undefined) {
  if (!availability) {
    return "Disponibilidade";
  }
  const normalized = availability.name?.trim();
  if (normalized && normalized.length > 0) {
    return normalized;
  }
  return `Disponibilidade-${String(availability._id ?? "sem-id")}`;
}

function parseIsoDateAndTimeToTimestamp(date: string, time: string) {
  const timestamp = Date.parse(`${date.trim()}T${time.trim()}:00`);
  if (Number.isNaN(timestamp)) {
    throw new Error("Data ou horário inválidos.");
  }
  return timestamp;
}

function isValidTimeValue(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseTimeToMinutes(time: string) {
  const [hoursRaw, minutesRaw] = time.split(":");
  const hours = Number(hoursRaw ?? "0");
  const minutes = Number(minutesRaw ?? "0");
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

function formatMinutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildSlotsWithinRange(startTime: string, endTime: string, durationMinutes: number) {
  const safeDuration = durationMinutes > 0 ? durationMinutes : 30;
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  const slots: string[] = [];

  for (let cursor = start; cursor + safeDuration <= end; cursor += safeDuration) {
    slots.push(formatMinutesToTime(cursor));
  }
  return slots;
}

function formatDateInTimezone(timestamp: number, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function formatTimeInTimezone(timestamp: number, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function buildSlotKey(groupName: string, isoDate: string, time: string) {
  return `${groupName}|${isoDate}|${time}`;
}

function inferPreferredPeriod(timestamp: number) {
  const hour = new Date(timestamp).getHours();
  if (hour < 12) {
    return "manha" as const;
  }
  if (hour < 18) {
    return "tarde" as const;
  }
  return "noite" as const;
}

function readStripePriceIdFromEnv() {
  const value = process.env.STRIPE_PRICE_ID?.trim();
  if (!value) {
    return undefined;
  }
  return value;
}

function normalizeStripePriceId(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  return normalized.startsWith("price_") ? normalized : undefined;
}

function normalizeAmountCents(value: number | undefined) {
  if (typeof value !== "number") {
    return undefined;
  }
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  if (!Number.isInteger(value)) {
    if (value >= 1000) {
      return Math.round(value);
    }
    return Math.round(value * 100);
  }
  if (value >= 1000) {
    return value;
  }
  return value * 100;
}

function parseLegacyAmountCentsFromStripePriceId(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  if (!normalized || normalized.startsWith("price_")) {
    return undefined;
  }
  if (/^\d+$/.test(normalized)) {
    const parsedInteger = Number(normalized);
    if (!Number.isFinite(parsedInteger) || parsedInteger <= 0) {
      return undefined;
    }
    if (normalized.length >= 4) {
      return parsedInteger;
    }
    return parsedInteger * 100;
  }
  const parsed = Number(normalized.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed * 100);
}

