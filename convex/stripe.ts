import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";

const RESERVATION_HOLD_DURATION_MS = 30 * 60_000;

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
    const referenceAvailability = await ctx.db.get(eventType.availabilityId);
    if (!referenceAvailability) {
      throw new Error("Disponibilidade base não encontrada.");
    }
    const slotTimestamp = parseIsoDateAndTimeToTimestamp(
      args.date,
      args.time,
      referenceAvailability.timezone,
    );
    if (!amountCents || amountCents <= 0) {
      throw new Error(
        "Evento sem valor válido para pagamento. Configure `priceCents` em centavos (ex.: 24700) no evento ou use um valor numérico válido no campo legado de preço.",
      );
    }

    await assertSlotIsAvailable(ctx, eventType, args.date, args.time, identity.subject);
    const endsAt = slotTimestamp + eventType.durationMinutes * 60_000;
    const holdExpiresAt = now + RESERVATION_HOLD_DURATION_MS;

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
    await assertCanCreateNewBookingDraft(
      ctx,
      identity.subject,
      existingReservations,
      existingDraft?._id ?? null,
      now,
    );

    let reservationId: Id<"reservations">;
    if (existingDraft) {
      reservationId = existingDraft._id;
      await ctx.db.patch(existingDraft._id, {
        availabilityId: eventType.availabilityId,
        endsAt,
        holdExpiresAt,
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
        holdExpiresAt,
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
      holdExpiresAt,
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
    holdExpiresAt: v.optional(v.number()),
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
      holdExpiresAt:
        typeof args.holdExpiresAt === "number" && Number.isFinite(args.holdExpiresAt)
          ? Math.round(args.holdExpiresAt)
          : reservation.holdExpiresAt,
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

export const cancelPendingReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
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
    if (reservation.status !== "pending") {
      return { ok: true, alreadyClosed: true };
    }

    const pendingPayment = await ctx.db
      .query("payments")
      .withIndex("by_reservation_id", (q) => q.eq("reservationId", reservation._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    const now = Date.now();
    await ctx.db.patch(reservation._id, {
      status: "cancelled",
      notes: "Reserva cancelada pelo paciente no painel.",
      updatedAt: now,
    });

    if (pendingPayment) {
      await ctx.db.patch(pendingPayment._id, {
        status: "failed",
        notes: "Pagamento cancelado pelo paciente no painel.",
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

    let notification:
      | {
          type: "appointment_confirmed";
          appointmentId: string;
          patientName: string;
          patientPhone: string;
          location: string;
          scheduledFor: number;
          timezone: string;
          consultationType: string;
        }
      | null = null;

    if (args.status === "paid") {
      notification = await markAsPaid(ctx, payment, reservation, args, now);
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

    return { ok: true, notification };
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
  if (reservation.status !== "pending" && reservation.status !== "confirmed") {
    await ctx.db.patch(payment._id, {
      status: "failed",
      externalId: args.checkoutSessionId ?? payment.externalId,
      lastStripeEventId: args.eventId.trim(),
      notes: "Pagamento recebido para reserva encerrada. Revisar e estornar no Stripe.",
      updatedAt: now,
    });
    return null;
  }
  if (reservation.status === "pending" && getReservationHoldExpiresAt(reservation) <= now) {
    await ctx.db.patch(payment._id, {
      status: "failed",
      externalId: args.checkoutSessionId ?? payment.externalId,
      lastStripeEventId: args.eventId.trim(),
      notes: "Pagamento recebido após expiração da janela de reserva. Revisar e estornar no Stripe.",
      updatedAt: now,
    });
    await ctx.db.patch(reservation._id, {
      status: "cancelled",
      notes: "Reserva expirada antes da confirmação do pagamento.",
      updatedAt: now,
    });
    return null;
  }

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
  const availability = await ctx.db.get(reservation.availabilityId);

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

  if (alreadyPaid) {
    return null;
  }

  return {
    type: "appointment_confirmed" as const,
    appointmentId: String(appointmentId),
    patientName: patient.name,
    patientPhone: patient.phone,
    location: eventType.location,
    scheduledFor: reservation.startsAt,
    timezone: availability?.timezone ?? "America/Fortaleza",
    consultationType: eventType.name ?? eventType.title ?? "Consulta oftalmologica",
  };
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
  excludedClerkUserId?: string,
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
  const now = Date.now();
  if (Number.isNaN(weekday)) {
    throw new Error("Data inválida.");
  }
  if (!isValidTimeValue(time)) {
    throw new Error("Horário inválido.");
  }
  if (!isIsoDateTimeInFutureForTimezone(isoDate, time, referenceAvailability.timezone, now)) {
    throw new Error("Horário já está no passado. Escolha um horário futuro.");
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
      isReservationBlocking(reservation, now) &&
      reservation.clerkUserId !== excludedClerkUserId,
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

async function assertCanCreateNewBookingDraft(
  ctx: MutationCtx,
  clerkUserId: string,
  reservations: Doc<"reservations">[],
  allowedReservationId: Id<"reservations"> | null,
  now: number,
) {
  const appointments = await ctx.db
    .query("appointments")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .collect();
  const hasActiveAppointment = appointments.some(
    (item) => item.status === "confirmed" || item.status === "rescheduled",
  );
  if (hasActiveAppointment) {
    throw new Error(
      "Você já possui um agendamento ativo. Para remarcar ou gerenciar sua consulta, acesse seu painel.",
    );
  }

  const hasOtherPendingReservation = reservations.some((item) => {
    if (item.status !== "pending" || getReservationHoldExpiresAt(item) <= now) {
      return false;
    }
    if (allowedReservationId && item._id === allowedReservationId) {
      return false;
    }
    return true;
  });
  if (hasOtherPendingReservation) {
    throw new Error(
      "Você já possui um agendamento aguardando remarcação. Finalize ou cancele o pendente atual.",
    );
  }
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

function parseIsoDateAndTimeToTimestamp(date: string, time: string, timezone: string) {
  const normalizedDate = date.trim();
  const normalizedTime = time.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate) || !isValidTimeValue(normalizedTime)) {
    throw new Error("Data ou horário inválidos.");
  }

  const [yearRaw, monthRaw, dayRaw] = normalizedDate.split("-");
  const [hourRaw, minuteRaw] = normalizedTime.split(":");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    throw new Error("Data ou horário inválidos.");
  }

  const desiredWallClockUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let timestamp = desiredWallClockUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offsetMs = getTimezoneOffsetMs(timezone, timestamp);
    timestamp = desiredWallClockUtc - offsetMs;
  }

  const resolvedDate = formatDateInTimezone(timestamp, timezone);
  const resolvedTime = formatTimeInTimezone(timestamp, timezone);
  if (resolvedDate !== normalizedDate || resolvedTime !== normalizedTime) {
    throw new Error("Data ou horário inválidos para o fuso horário da disponibilidade.");
  }

  return timestamp;
}

function getTimezoneOffsetMs(timezone: string, timestamp: number) {
  const zonedParts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .formatToParts(new Date(timestamp))
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") {
        acc[part.type] = part.value;
      }
      return acc;
    }, {});

  const zonedTimestampAsUtc = Date.UTC(
    Number(zonedParts.year ?? "0"),
    Number(zonedParts.month ?? "1") - 1,
    Number(zonedParts.day ?? "1"),
    Number(zonedParts.hour ?? "0"),
    Number(zonedParts.minute ?? "0"),
    Number(zonedParts.second ?? "0"),
    0,
  );

  return zonedTimestampAsUtc - timestamp;
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

function isReservationBlocking(
  reservation: Doc<"reservations">,
  now: number,
) {
  if (reservation.status === "confirmed") {
    return true;
  }
  if (reservation.status !== "pending") {
    return false;
  }
  return getReservationHoldExpiresAt(reservation) > now;
}

function getReservationHoldExpiresAt(reservation: Doc<"reservations">) {
  return reservation.holdExpiresAt ?? reservation.updatedAt + RESERVATION_HOLD_DURATION_MS;
}

function isIsoDateTimeInFutureForTimezone(
  isoDate: string,
  time: string,
  timezone: string,
  now: number,
) {
  const currentDate = formatDateInTimezone(now, timezone);
  if (isoDate > currentDate) {
    return true;
  }
  if (isoDate < currentDate) {
    return false;
  }
  const currentTime = formatTimeInTimezone(now, timezone);
  return time > currentTime;
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

