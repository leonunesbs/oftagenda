import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const locationValidator = v.union(
  v.literal("fortaleza"),
  v.literal("sao_domingos_do_maranhao"),
  v.literal("fortuna"),
);

const availabilityStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
);

const reservationStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("cancelled"),
  v.literal("completed"),
);

const paymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("refunded"),
  v.literal("failed"),
);

const paymentMethodValidator = v.union(
  v.literal("pix"),
  v.literal("card"),
  v.literal("cash"),
  v.literal("transfer"),
);
const eventKindValidator = v.union(v.literal("consulta"), v.literal("procedimento"), v.literal("exame"));

const paymentModeValidator = v.union(
  v.literal("booking_fee"),
  v.literal("full_payment"),
  v.literal("in_person"),
);

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }

  const userRole = await ctx.db
    .query("user_roles")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
    .first();
  if (userRole?.role !== "admin") {
    throw new Error("Not authorized");
  }

  return identity;
}

export const getManagementSnapshot = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [
      eventTypes,
      availabilities,
      availabilityOverrides,
      reservations,
      appointments,
      patients,
      payments,
      appointmentEvents,
    ] =
      await Promise.all([
        ctx.db.query("event_types").collect(),
        ctx.db.query("availabilities").collect(),
        ctx.db.query("availability_overrides").collect(),
        ctx.db.query("reservations").collect(),
        ctx.db.query("appointments").collect(),
        ctx.db.query("patients").collect(),
        ctx.db.query("payments").collect(),
        ctx.db.query("appointment_events").collect(),
      ]);

    const eventTypeById = new Map(eventTypes.map((item) => [item._id, item]));
    const availabilityById = new Map(availabilities.map((item) => [item._id, item]));

    const reservationRows = [...reservations]
      .sort((a, b) => b.startsAt - a.startsAt)
      .map((reservation) => ({
        ...reservation,
        eventTypeTitle:
          eventTypeById.get(reservation.eventTypeId)?.name ??
          eventTypeById.get(reservation.eventTypeId)?.title ??
          "Evento removido",
        availabilityLabel: formatAvailabilityLabel(availabilityById.get(reservation.availabilityId)),
      }));

    const recentAppointmentEvents = [...appointmentEvents]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);

    const availabilityRows = [...availabilities]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((availability) => ({
        ...availability,
        linkedEventsCount: eventTypes.filter((eventType) => {
          if (!eventType.availabilityId) {
            return false;
          }
          const eventAvailability = availabilityById.get(eventType.availabilityId);
          return (
            resolveAvailabilityGroupName(eventAvailability) === resolveAvailabilityGroupName(availability)
          );
        }).length,
      }));

    const recentPayments = [...payments]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20);

    const userMap = new Map<
      string,
      {
        clerkUserId: string;
        name?: string;
        email?: string;
        phone?: string;
        reservationsCount: number;
        appointmentsCount: number;
        paymentsCount: number;
        paidAmountCents: number;
        latestActivity: number;
      }
    >();

    const ensureUser = (clerkUserId: string) => {
      if (!userMap.has(clerkUserId)) {
        userMap.set(clerkUserId, {
          clerkUserId,
          reservationsCount: 0,
          appointmentsCount: 0,
          paymentsCount: 0,
          paidAmountCents: 0,
          latestActivity: 0,
        });
      }
      return userMap.get(clerkUserId)!;
    };

    for (const patient of patients) {
      const user = ensureUser(patient.clerkUserId);
      user.name = patient.name;
      user.email = patient.email;
      user.phone = patient.phone;
      user.latestActivity = Math.max(user.latestActivity, patient.updatedAt);
    }

    for (const appointment of appointments) {
      const user = ensureUser(appointment.clerkUserId);
      user.appointmentsCount += 1;
      user.latestActivity = Math.max(user.latestActivity, appointment.updatedAt);
    }

    for (const reservation of reservations) {
      const user = ensureUser(reservation.clerkUserId);
      user.reservationsCount += 1;
      user.latestActivity = Math.max(user.latestActivity, reservation.updatedAt);
    }

    for (const payment of payments) {
      const user = ensureUser(payment.clerkUserId);
      user.paymentsCount += 1;
      if (payment.status === "paid") {
        user.paidAmountCents += payment.amountCents;
      }
      user.latestActivity = Math.max(user.latestActivity, payment.updatedAt);
    }

    const users = [...userMap.values()].sort((a, b) => b.latestActivity - a.latestActivity);

    return {
      metrics: {
        events: eventTypes.length,
        activeEvents: eventTypes.filter((item) => item.active).length,
        availabilities: availabilities.length,
        activeAvailabilities: availabilities.filter((item) => item.status === "active").length,
        reservations: reservations.length,
        pendingReservations: reservations.filter((item) => item.status === "pending").length,
        confirmedReservations: reservations.filter((item) => item.status === "confirmed").length,
        appointments: appointments.length,
        patients: patients.length,
        users: users.length,
        payments: payments.length,
        paidPayments: payments.filter((item) => item.status === "paid").length,
        paidRevenueCents: payments
          .filter((item) => item.status === "paid")
          .reduce((sum, item) => sum + item.amountCents, 0),
        appointmentEvents: appointmentEvents.length,
      },
      eventTypes: [...eventTypes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 20),
      availabilities: availabilityRows,
      availabilityOverrides: [...availabilityOverrides].sort((a, b) => b.updatedAt - a.updatedAt),
      reservations: reservationRows,
      users,
      payments: recentPayments,
      appointmentEvents: recentAppointmentEvents,
    };
  },
});

export const getCalendarData = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!Number.isFinite(args.startDate) || !Number.isFinite(args.endDate) || args.startDate > args.endDate) {
      throw new Error("Intervalo de datas invalido");
    }

    const [eventTypes, reservations] = await Promise.all([
      ctx.db.query("event_types").collect(),
      ctx.db.query("reservations").collect(),
    ]);
    const eventTypeById = new Map(eventTypes.map((eventType) => [String(eventType._id), eventType]));

    const items = reservations
      .filter((reservation) => reservation.startsAt >= args.startDate && reservation.startsAt <= args.endDate)
      .sort((a, b) => a.startsAt - b.startsAt)
      .map((reservation) => {
        const eventType = eventTypeById.get(String(reservation.eventTypeId));
        return {
          _id: reservation._id,
          reservationId: reservation._id,
          appointmentId: reservation.appointmentId ?? null,
          startsAt: reservation.startsAt,
          endsAt: reservation.endsAt,
          status: reservation.status,
          notes: reservation.notes ?? "",
          clerkUserId: reservation.clerkUserId,
          eventTypeId: reservation.eventTypeId,
          eventTypeTitle: eventType?.name ?? eventType?.title ?? "Evento removido",
          kind: eventType?.kind ?? "consulta",
          location: eventType?.location ?? "fortaleza",
        };
      });

    return { items };
  },
});

export const createEventType = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    address: v.string(),
    notes: v.optional(v.string()),
    kind: eventKindValidator,
    durationMinutes: v.number(),
    priceCents: v.number(),
    stripePriceId: v.optional(v.string()),
    paymentMode: v.optional(paymentModeValidator),
    location: locationValidator,
    availabilityId: v.id("availabilities"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (!args.name.trim()) {
      throw new Error("Nome da disponibilidade e obrigatorio");
    }

    const slug = args.slug.trim().toLowerCase();
    const existing = await ctx.db
      .query("event_types")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      throw new Error("Slug de evento ja existe");
    }

    if (args.durationMinutes <= 0) {
      throw new Error("Duracao deve ser maior que zero");
    }
    const normalizedPriceCents = normalizePriceCentsInput(args.priceCents);
    if (normalizedPriceCents < 0) {
      throw new Error("Valor deve ser maior ou igual a zero");
    }
    if (!args.name.trim() || !args.address.trim()) {
      throw new Error("Nome e endereco do evento sao obrigatorios");
    }

    const availability = await ctx.db.get(args.availabilityId);
    if (!availability) {
      throw new Error("Disponibilidade nao encontrada");
    }

    const now = Date.now();
    const eventTypeId = await ctx.db.insert("event_types", {
      slug,
      title: args.name.trim(),
      description: args.notes?.trim(),
      name: args.name.trim(),
      address: args.address.trim(),
      notes: args.notes?.trim(),
      kind: args.kind,
      durationMinutes: args.durationMinutes,
      priceCents: normalizedPriceCents,
      stripePriceId: args.stripePriceId?.trim() || undefined,
      paymentMode: args.paymentMode ?? "booking_fee",
      location: args.location,
      availabilityId: args.availabilityId,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    return { eventTypeId };
  },
});

export const updateEventType = mutation({
  args: {
    eventTypeId: v.id("event_types"),
    slug: v.string(),
    name: v.string(),
    address: v.string(),
    notes: v.optional(v.string()),
    kind: eventKindValidator,
    durationMinutes: v.number(),
    priceCents: v.number(),
    stripePriceId: v.optional(v.string()),
    paymentMode: v.optional(paymentModeValidator),
    location: locationValidator,
    availabilityId: v.id("availabilities"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const current = await ctx.db.get(args.eventTypeId);
    if (!current) {
      throw new Error("Evento nao encontrado");
    }

    const slug = args.slug.trim().toLowerCase();
    const existing = await ctx.db
      .query("event_types")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing && existing._id !== args.eventTypeId) {
      throw new Error("Slug de evento ja existe");
    }

    if (args.durationMinutes <= 0) {
      throw new Error("Duracao deve ser maior que zero");
    }
    const normalizedPriceCents = normalizePriceCentsInput(args.priceCents);
    if (normalizedPriceCents < 0) {
      throw new Error("Valor deve ser maior ou igual a zero");
    }
    if (!args.name.trim() || !args.address.trim()) {
      throw new Error("Nome e endereco do evento sao obrigatorios");
    }

    const availability = await ctx.db.get(args.availabilityId);
    if (!availability) {
      throw new Error("Disponibilidade nao encontrada");
    }

    await ctx.db.patch(args.eventTypeId, {
      slug,
      title: args.name.trim(),
      description: args.notes?.trim(),
      name: args.name.trim(),
      address: args.address.trim(),
      notes: args.notes?.trim(),
      kind: args.kind,
      durationMinutes: args.durationMinutes,
      priceCents: normalizedPriceCents,
      stripePriceId: args.stripePriceId?.trim() || undefined,
      paymentMode: args.paymentMode ?? "booking_fee",
      location: args.location,
      availabilityId: args.availabilityId,
      active: args.active,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const setEventTypeActive = mutation({
  args: {
    eventTypeId: v.id("event_types"),
    active: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    await ctx.db.patch(args.eventTypeId, { active: args.active, updatedAt: now });
    return { ok: true };
  },
});

export const deleteEventType = mutation({
  args: {
    eventTypeId: v.id("event_types"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const eventType = await ctx.db.get(args.eventTypeId);
    if (!eventType) {
      throw new Error("Evento nao encontrado");
    }

    const [reservations, appointments] = await Promise.all([
      ctx.db
        .query("reservations")
        .withIndex("by_event_type_id", (q) => q.eq("eventTypeId", args.eventTypeId))
        .collect(),
      ctx.db.query("appointments").collect(),
    ]);

    const linkedAppointments = appointments.filter((item) => item.eventTypeId === args.eventTypeId);
    if (reservations.length > 0 || linkedAppointments.length > 0) {
      throw new Error("Nao e possivel excluir evento com dependencias");
    }

    await ctx.db.delete(args.eventTypeId);
    return { ok: true };
  },
});

export const createAvailability = mutation({
  args: {
    name: v.string(),
    weekday: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    timezone: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.weekday < 0 || args.weekday > 6) {
      throw new Error("weekday deve estar entre 0 e 6");
    }

    if (args.startTime >= args.endTime) {
      throw new Error("Horário inicial deve ser menor que o final");
    }

    const now = Date.now();
    const availabilityId = await ctx.db.insert("availabilities", {
      name: args.name.trim(),
      weekday: args.weekday,
      startTime: args.startTime.trim(),
      endTime: args.endTime.trim(),
      timezone: args.timezone.trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    return { availabilityId };
  },
});

const availabilityDaySlotInputValidator = v.object({
  availabilityId: v.optional(v.id("availabilities")),
  startTime: v.string(),
  endTime: v.string(),
  status: availabilityStatusValidator,
});
const availabilityOverrideSlotInputValidator = v.object({
  startTime: v.string(),
  endTime: v.string(),
  status: availabilityStatusValidator,
});

export const upsertAvailabilityDaySlots = mutation({
  args: {
    groupName: v.string(),
    previousGroupName: v.optional(v.string()),
    weekday: v.number(),
    timezone: v.string(),
    slots: v.array(availabilityDaySlotInputValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.weekday < 0 || args.weekday > 6) {
      throw new Error("weekday deve estar entre 0 e 6");
    }

    const normalizedGroupName = args.groupName.trim();
    if (!normalizedGroupName) {
      throw new Error("Nome do grupo de disponibilidade e obrigatorio");
    }
    const normalizedPreviousGroupName = args.previousGroupName?.trim() || normalizedGroupName;

    const normalizedTimezone = args.timezone.trim();
    if (!normalizedTimezone) {
      throw new Error("Timezone e obrigatorio");
    }

    const normalizedSlots = args.slots.map((slot, index) => {
      const startTime = slot.startTime.trim();
      const endTime = slot.endTime.trim();
      if (!isValidTimeValue(startTime) || !isValidTimeValue(endTime)) {
        throw new Error(`Faixa ${index + 1}: horário invalido, use formato HH:mm`);
      }
      if (startTime >= endTime) {
        throw new Error(`Faixa ${index + 1}: horário inicial deve ser menor que o final`);
      }
      return {
        availabilityId: slot.availabilityId,
        startTime,
        endTime,
        status: slot.status,
      };
    });

    ensureNoOverlappingSlots(normalizedSlots);

    const allAvailabilities = await ctx.db.query("availabilities").collect();
    const existingSlots = allAvailabilities.filter(
      (availability) =>
        availability.weekday === args.weekday &&
        resolveAvailabilityGroupName(availability) === normalizedPreviousGroupName,
    );
    const existingById = new Map(existingSlots.map((slot) => [slot._id, slot]));

    for (const slot of normalizedSlots) {
      if (!slot.availabilityId) {
        continue;
      }
      const current = existingById.get(slot.availabilityId);
      if (!current) {
        throw new Error("Uma das faixas informadas nao pertence a este grupo/dia");
      }
    }

    const now = Date.now();
    const keepIds = new Set<Id<"availabilities">>();
    const updatedOrCreatedIds: Id<"availabilities">[] = [];

    for (const slot of normalizedSlots) {
      if (slot.availabilityId) {
        keepIds.add(slot.availabilityId);
        await ctx.db.patch(slot.availabilityId, {
          name: normalizedGroupName,
          weekday: args.weekday,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone: normalizedTimezone,
          status: slot.status,
          updatedAt: now,
        });
        updatedOrCreatedIds.push(slot.availabilityId);
        continue;
      }

      const availabilityId = await ctx.db.insert("availabilities", {
        name: normalizedGroupName,
        weekday: args.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: normalizedTimezone,
        status: slot.status,
        createdAt: now,
        updatedAt: now,
      });
      keepIds.add(availabilityId);
      updatedOrCreatedIds.push(availabilityId);
    }

    const toDelete = existingSlots.filter((slot) => !keepIds.has(slot._id));

    for (const slot of toDelete) {
      const [reservations, linkedEvents] = await Promise.all([
        ctx.db
          .query("reservations")
          .withIndex("by_availability_id", (q) => q.eq("availabilityId", slot._id))
          .collect(),
        ctx.db
          .query("event_types")
          .withIndex("by_availability_id", (q) => q.eq("availabilityId", slot._id))
          .collect(),
      ]);

      if (reservations.length > 0) {
        throw new Error(
          `Nao e possivel remover a faixa ${slot.startTime}-${slot.endTime}: existem reservas vinculadas`,
        );
      }
      if (linkedEvents.length > 0) {
        throw new Error(
          `Nao e possivel remover a faixa ${slot.startTime}-${slot.endTime}: existem eventos vinculados`,
        );
      }
    }

    for (const slot of toDelete) {
      await ctx.db.delete(slot._id);
    }

    if (normalizedPreviousGroupName !== normalizedGroupName) {
      const overridesToRename = await ctx.db
        .query("availability_overrides")
        .withIndex("by_group_name", (q) => q.eq("groupName", normalizedPreviousGroupName))
        .collect();
      for (const override of overridesToRename) {
        await ctx.db.patch(override._id, {
          groupName: normalizedGroupName,
          updatedAt: now,
        });
      }
    }

    return {
      ok: true,
      updatedOrCreatedIds,
      deletedCount: toDelete.length,
    };
  },
});

export const upsertAvailabilityDateOverrides = mutation({
  args: {
    groupName: v.string(),
    timezone: v.string(),
    dates: v.array(v.string()),
    allDayUnavailable: v.boolean(),
    slots: v.array(availabilityOverrideSlotInputValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const normalizedGroupName = args.groupName.trim();
    if (!normalizedGroupName) {
      throw new Error("Nome do grupo de disponibilidade e obrigatorio");
    }

    const normalizedTimezone = args.timezone.trim();
    if (!normalizedTimezone) {
      throw new Error("Timezone e obrigatorio");
    }

    const normalizedDates = [...new Set(args.dates.map((date) => date.trim()))];
    if (normalizedDates.length === 0) {
      throw new Error("Selecione ao menos uma data para substituicao");
    }
    for (const date of normalizedDates) {
      if (!isValidIsoDate(date)) {
        throw new Error(`Data invalida: ${date}`);
      }
    }

    const normalizedSlots = args.slots.map((slot, index) => {
      const startTime = slot.startTime.trim();
      const endTime = slot.endTime.trim();
      if (!isValidTimeValue(startTime) || !isValidTimeValue(endTime)) {
        throw new Error(`Faixa ${index + 1}: horário invalido, use formato HH:mm`);
      }
      if (startTime >= endTime) {
        throw new Error(`Faixa ${index + 1}: horário inicial deve ser menor que o final`);
      }
      return {
        startTime,
        endTime,
        status: slot.status,
      };
    });

    if (!args.allDayUnavailable && normalizedSlots.length === 0) {
      throw new Error("Informe ao menos um horário para a substituicao");
    }

    if (!args.allDayUnavailable) {
      ensureNoOverlappingSlots(normalizedSlots.filter((slot) => slot.status === "active"));
    }

    const existingOverrides = await ctx.db
      .query("availability_overrides")
      .withIndex("by_group_name", (q) => q.eq("groupName", normalizedGroupName))
      .collect();
    const existingByDate = new Map(existingOverrides.map((override) => [override.date, override]));

    const now = Date.now();
    const upsertedIds: Id<"availability_overrides">[] = [];
    for (const date of normalizedDates) {
      const current = existingByDate.get(date);
      if (current) {
        await ctx.db.patch(current._id, {
          timezone: normalizedTimezone,
          allDayUnavailable: args.allDayUnavailable,
          slots: args.allDayUnavailable ? [] : normalizedSlots,
          updatedAt: now,
        });
        upsertedIds.push(current._id);
        continue;
      }
      const createdId = await ctx.db.insert("availability_overrides", {
        groupName: normalizedGroupName,
        date,
        timezone: normalizedTimezone,
        allDayUnavailable: args.allDayUnavailable,
        slots: args.allDayUnavailable ? [] : normalizedSlots,
        createdAt: now,
        updatedAt: now,
      });
      upsertedIds.push(createdId);
    }

    return {
      ok: true,
      upsertedIds,
      affectedDates: normalizedDates.length,
    };
  },
});

export const deleteAvailabilityDateOverride = mutation({
  args: {
    overrideId: v.id("availability_overrides"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const current = await ctx.db.get(args.overrideId);
    if (!current) {
      throw new Error("Substituicao por data nao encontrada");
    }

    await ctx.db.delete(args.overrideId);
    return { ok: true };
  },
});

export const setAvailabilityStatus = mutation({
  args: {
    availabilityId: v.id("availabilities"),
    status: availabilityStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.availabilityId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

export const setAvailabilityWeekdayStatus = mutation({
  args: {
    availabilityId: v.id("availabilities"),
    status: availabilityStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const availability = await ctx.db.get(args.availabilityId);
    if (!availability) {
      throw new Error("Disponibilidade nao encontrada");
    }

    await ctx.db.patch(args.availabilityId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const updateAvailability = mutation({
  args: {
    availabilityId: v.id("availabilities"),
    name: v.string(),
    weekday: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    timezone: v.string(),
    status: availabilityStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const availability = await ctx.db.get(args.availabilityId);
    if (!availability) {
      throw new Error("Disponibilidade nao encontrada");
    }

    if (args.weekday < 0 || args.weekday > 6) {
      throw new Error("weekday deve estar entre 0 e 6");
    }

    if (args.startTime >= args.endTime) {
      throw new Error("Horário inicial deve ser menor que o final");
    }

    await ctx.db.patch(args.availabilityId, {
      name: args.name.trim(),
      weekday: args.weekday,
      startTime: args.startTime.trim(),
      endTime: args.endTime.trim(),
      timezone: args.timezone.trim(),
      status: args.status,
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const deleteAvailability = mutation({
  args: {
    availabilityId: v.id("availabilities"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const availability = await ctx.db.get(args.availabilityId);
    if (!availability) {
      throw new Error("Disponibilidade nao encontrada");
    }

    const [reservations, linkedEvents] = await Promise.all([
      ctx.db
        .query("reservations")
        .withIndex("by_availability_id", (q) => q.eq("availabilityId", args.availabilityId))
        .collect(),
      ctx.db
        .query("event_types")
        .withIndex("by_availability_id", (q) => q.eq("availabilityId", args.availabilityId))
        .collect(),
    ]);

    if (reservations.length > 0) {
      throw new Error("Nao e possivel excluir disponibilidade com reservas vinculadas");
    }
    if (linkedEvents.length > 0) {
      throw new Error("Nao e possivel excluir disponibilidade vinculada a eventos");
    }

    await ctx.db.delete(args.availabilityId);
    return { ok: true };
  },
});

export const createReservation = mutation({
  args: {
    clerkUserId: v.string(),
    eventTypeId: v.id("event_types"),
    availabilityId: v.id("availabilities"),
    date: v.string(),
    time: v.string(),
    status: reservationStatusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const eventType = await ctx.db.get(args.eventTypeId);
    if (!eventType) {
      throw new Error("Evento nao encontrado");
    }

    const matchedAvailability = await resolveAvailabilityForReservation(
      ctx,
      eventType,
      args.availabilityId,
      args.date,
      args.time,
    );

    const startsAt = parseIsoDateAndTimeToTimestamp(
      args.date,
      args.time,
      matchedAvailability.timezone,
    );
    const endsAt = startsAt + eventType.durationMinutes * 60_000;
    const now = Date.now();

    const reservationId = await ctx.db.insert("reservations", {
      clerkUserId: args.clerkUserId.trim(),
      eventTypeId: args.eventTypeId,
      availabilityId: matchedAvailability._id,
      startsAt,
      endsAt,
      status: args.status,
      notes: args.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    });

    return { reservationId };
  },
});

export const adminCreateAppointment = mutation({
  args: {
    clerkUserId: v.optional(v.string()),
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    eventTypeId: v.id("event_types"),
    availabilityId: v.id("availabilities"),
    date: v.string(),
    time: v.string(),
    preferredPeriod: v.union(
      v.literal("manha"),
      v.literal("tarde"),
      v.literal("noite"),
      v.literal("qualquer"),
    ),
    reason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);
    const now = Date.now();

    const eventType = await ctx.db.get(args.eventTypeId);
    if (!eventType) {
      throw new Error("Evento nao encontrado");
    }

    const matchedAvailability = await resolveAvailabilityForReservation(
      ctx,
      eventType,
      args.availabilityId,
      args.date,
      args.time,
    );
    const startsAt = parseIsoDateAndTimeToTimestamp(args.date, args.time, matchedAvailability.timezone);
    const endsAt = startsAt + eventType.durationMinutes * 60_000;

    const existingConflict = (
      await ctx.db
        .query("reservations")
        .withIndex("by_event_type_id", (q) => q.eq("eventTypeId", args.eventTypeId))
        .collect()
    ).find(
      (reservation) =>
        reservation.startsAt === startsAt &&
        (reservation.status === "confirmed" || reservation.status === "pending"),
    );
    if (existingConflict) {
      throw new Error("Horario ja reservado para este evento");
    }

    const generatedClerkUserId =
      args.clerkUserId?.trim() ||
      buildSyntheticClerkUserId(args.email, args.phone, args.name, now);
    const patient = await findOrCreatePatientForAdmin(
      ctx,
      generatedClerkUserId,
      args.name.trim(),
      args.phone.trim(),
      args.email.trim(),
      now,
    );

    const reservationId = await ctx.db.insert("reservations", {
      clerkUserId: generatedClerkUserId,
      eventTypeId: args.eventTypeId,
      availabilityId: matchedAvailability._id,
      startsAt,
      endsAt,
      status: "confirmed",
      notes: args.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    });

    const appointmentId = await ctx.db.insert("appointments", {
      clerkUserId: generatedClerkUserId,
      patientId: patient._id,
      name: args.name.trim(),
      phone: args.phone.trim(),
      email: args.email.trim(),
      location: eventType.location,
      eventTypeId: args.eventTypeId,
      reservationId,
      preferredPeriod: args.preferredPeriod,
      reason: args.reason?.trim(),
      status: "confirmed",
      requestedAt: now,
      scheduledFor: startsAt,
      consultationType: eventType.name ?? eventType.title ?? "Consulta oftalmologica",
      updatedAt: now,
    });

    await ctx.db.patch(reservationId, {
      appointmentId,
      updatedAt: now,
    });

    await ctx.db.insert("appointment_events", {
      appointmentId,
      clerkUserId: identity.subject,
      eventType: "confirmed",
      notes: "Agendamento criado manualmente pelo admin.",
      payload: JSON.stringify({
        reservationId,
        eventTypeId: args.eventTypeId,
      }),
      createdAt: now,
    });

    return {
      ok: true,
      appointmentId,
      reservationId,
      scheduledFor: startsAt,
    };
  },
});

export const updateReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    clerkUserId: v.string(),
    eventTypeId: v.id("event_types"),
    availabilityId: v.id("availabilities"),
    date: v.string(),
    time: v.string(),
    status: reservationStatusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new Error("Reserva nao encontrada");
    }

    const eventType = await ctx.db.get(args.eventTypeId);
    if (!eventType) {
      throw new Error("Evento nao encontrado");
    }

    const matchedAvailability = await resolveAvailabilityForReservation(
      ctx,
      eventType,
      args.availabilityId,
      args.date,
      args.time,
    );

    const startsAt = parseIsoDateAndTimeToTimestamp(
      args.date,
      args.time,
      matchedAvailability.timezone,
    );
    const endsAt = startsAt + eventType.durationMinutes * 60_000;
    const now = Date.now();

    await ctx.db.patch(args.reservationId, {
      clerkUserId: args.clerkUserId.trim(),
      eventTypeId: args.eventTypeId,
      availabilityId: matchedAvailability._id,
      startsAt,
      endsAt,
      status: args.status,
      notes: args.notes?.trim(),
      updatedAt: now,
    });

    if (reservation.appointmentId) {
      const appointmentStatus = mapReservationToAppointmentStatus(args.status);
      if (appointmentStatus) {
        await ctx.db.patch(reservation.appointmentId, {
          status: appointmentStatus,
          updatedAt: now,
        });

        await ctx.db.insert("appointment_events", {
          appointmentId: reservation.appointmentId,
          clerkUserId: identity.subject,
          eventType: appointmentStatus === "confirmed" ? "confirmed" : appointmentStatus,
          notes: `Reserva atualizada pelo admin para ${args.status}`,
          createdAt: now,
        });
      }
    }

    return { ok: true };
  },
});

export const deleteReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new Error("Reserva nao encontrada");
    }

    if (reservation.appointmentId) {
      throw new Error("Nao e possivel excluir reserva vinculada a agendamento");
    }

    await ctx.db.delete(args.reservationId);
    return { ok: true };
  },
});

export const setReservationStatus = mutation({
  args: {
    reservationId: v.id("reservations"),
    status: reservationStatusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAdmin(ctx);

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new Error("Reserva nao encontrada");
    }

    const now = Date.now();
    await ctx.db.patch(args.reservationId, {
      status: args.status,
      notes: args.notes?.trim(),
      updatedAt: now,
    });

    if (reservation.appointmentId) {
      const appointmentStatus = mapReservationToAppointmentStatus(args.status);
      if (appointmentStatus) {
        await ctx.db.patch(reservation.appointmentId, {
          status: appointmentStatus,
          updatedAt: now,
        });

        await ctx.db.insert("appointment_events", {
          appointmentId: reservation.appointmentId,
          clerkUserId: identity.subject,
          eventType: appointmentStatus === "confirmed" ? "confirmed" : appointmentStatus,
          notes: `Status alterado pelo admin para ${args.status}`,
          createdAt: now,
        });
      }
    }

    return { ok: true };
  },
});

export const createPayment = mutation({
  args: {
    reservationId: v.optional(v.id("reservations")),
    clerkUserId: v.optional(v.string()),
    amountCents: v.number(),
    currency: v.string(),
    method: paymentMethodValidator,
    status: paymentStatusValidator,
    externalId: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let clerkUserId = args.clerkUserId?.trim();
    if (args.reservationId) {
      const reservation = await ctx.db.get(args.reservationId);
      if (!reservation) {
        throw new Error("Reserva nao encontrada");
      }
      clerkUserId = reservation.clerkUserId;
    }

    if (!clerkUserId) {
      throw new Error("Informe um clerkUserId ou reservationId");
    }

    if (args.amountCents <= 0) {
      throw new Error("Valor deve ser maior que zero");
    }

    const now = Date.now();
    const paymentId = await ctx.db.insert("payments", {
      clerkUserId,
      reservationId: args.reservationId,
      amountCents: args.amountCents,
      currency: args.currency.trim().toUpperCase(),
      method: args.method,
      status: args.status,
      externalId: args.externalId?.trim(),
      notes: args.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    });

    return { paymentId };
  },
});

export const setPaymentStatus = mutation({
  args: {
    paymentId: v.id("payments"),
    status: paymentStatusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.paymentId, {
      status: args.status,
      notes: args.notes?.trim(),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

function formatAvailabilityLabel(
  availability:
    | {
        _id?: unknown;
        name?: string;
        weekday: number;
        startTime: string;
        endTime: string;
      }
    | undefined,
) {
  if (!availability) {
    return "Disponibilidade removida";
  }
  const groupName = resolveAvailabilityGroupName(availability);
  return `${groupName} - ${availability.weekday} ${availability.startTime}-${availability.endTime}`;
}

function mapReservationToAppointmentStatus(status: "pending" | "confirmed" | "cancelled" | "completed") {
  if (status === "confirmed") {
    return "confirmed";
  }
  if (status === "cancelled") {
    return "cancelled";
  }
  if (status === "completed") {
    return "completed";
  }
  return null;
}

function parseIsoDateAndTimeToTimestamp(date: string, time: string, timezone: string) {
  const normalizedDate = date.trim();
  const normalizedTime = time.trim();
  if (!isValidIsoDate(normalizedDate) || !isValidTimeValue(normalizedTime)) {
    throw new Error("Data ou horário invalidos");
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
    throw new Error("Data ou horário invalidos");
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
    throw new Error("Data ou horário invalido para o fuso da disponibilidade");
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

function parseTimeToMinutes(value: string) {
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw ?? "0");
  const minutes = Number(minutesRaw ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

function isValidTimeValue(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return parsed.toISOString().slice(0, 10) === value;
}

function ensureNoOverlappingSlots(
  slots: Array<{
    startTime: string;
    endTime: string;
  }>,
) {
  const ranges = [...slots]
    .map((slot) => ({
      start: parseTimeToMinutes(slot.startTime),
      end: parseTimeToMinutes(slot.endTime),
      startTime: slot.startTime,
      endTime: slot.endTime,
    }))
    .sort((a, b) => a.start - b.start);

  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1];
    const current = ranges[index];
    if (!previous || !current) {
      continue;
    }
    if (current.start < previous.end) {
      throw new Error(
        `Faixas sobrepostas: ${previous.startTime}-${previous.endTime} e ${current.startTime}-${current.endTime}`,
      );
    }
  }
}

function validateSlotMatchesAvailability(
  date: string,
  time: string,
  availability: {
    weekday: number;
    startTime: string;
    endTime: string;
  },
) {
  const parsedDate = new Date(`${date.trim()}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Data invalida");
  }

  if (parsedDate.getDay() !== availability.weekday) {
    throw new Error("Data nao corresponde ao dia da disponibilidade");
  }

  const slot = parseTimeToMinutes(time.trim());
  const start = parseTimeToMinutes(availability.startTime);
  const end = parseTimeToMinutes(availability.endTime);
  if (slot < start || slot >= end) {
    throw new Error("Horário fora da faixa da disponibilidade");
  }
}

async function resolveAvailabilityForReservation(
  ctx: MutationCtx,
  eventType: { availabilityId?: Id<"availabilities"> },
  requestedAvailabilityId: Id<"availabilities">,
  date: string,
  time: string,
) {
  if (!eventType.availabilityId) {
    throw new Error("Evento informado nao possui disponibilidade vinculada");
  }

  const [eventAvailability, requestedAvailability, allAvailabilities] = await Promise.all([
    ctx.db.get(eventType.availabilityId),
    ctx.db.get(requestedAvailabilityId),
    ctx.db.query("availabilities").collect(),
  ]);

  if (!eventAvailability || !requestedAvailability) {
    throw new Error("Disponibilidade nao encontrada");
  }

  const eventGroupName = resolveAvailabilityGroupName(eventAvailability);
  const requestedGroupName = resolveAvailabilityGroupName(requestedAvailability);
  if (eventGroupName !== requestedGroupName) {
    throw new Error("Evento informado nao utiliza o grupo de disponibilidade selecionado");
  }

  const groupSlots = allAvailabilities.filter(
    (availability) =>
      resolveAvailabilityGroupName(availability) === eventGroupName && availability.status === "active",
  );
  if (groupSlots.length === 0) {
    throw new Error("Grupo de disponibilidade sem faixas ativas");
  }

  const matched = groupSlots.find((slotAvailability) =>
    slotMatchesAvailability(date, time, {
      weekday: slotAvailability.weekday,
      startTime: slotAvailability.startTime,
      endTime: slotAvailability.endTime,
    }),
  );
  if (!matched) {
    throw new Error("Horário fora das faixas configuradas para este grupo de disponibilidade");
  }

  return matched;
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

function slotMatchesAvailability(
  date: string,
  time: string,
  availability: {
    weekday: number;
    startTime: string;
    endTime: string;
  },
) {
  try {
    validateSlotMatchesAvailability(date, time, availability);
    return true;
  } catch {
    return false;
  }
}

function normalizePriceCentsInput(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return value;
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

function buildSyntheticClerkUserId(email: string, phone: string, name: string, now: number) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = phone.replace(/\D+/g, "");
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, "-");
  const seed = normalizedPhone || normalizedEmail || normalizedName || String(now);
  return `admin-${seed}`;
}

async function findOrCreatePatientForAdmin(
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
  const patientId = await ctx.db.insert("patients", {
    clerkUserId,
    name,
    phone,
    email,
    createdAt: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(patientId);
  if (!created) {
    throw new Error("Nao foi possivel criar o paciente");
  }
  return created;
}
