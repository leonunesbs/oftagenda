import { v } from "convex/values";

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

const ADMIN_PERMISSION = "org:admin:oftagenda";
const ADMIN_ROLES = new Set(["admin", "org:admin"]);

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function readClaim(claims: Record<string, unknown>, path: string[]) {
  let current: unknown = claims;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function isAdminFromIdentity(identity: Record<string, unknown>) {
  const roleCandidates = [
    readClaim(identity, ["org_role"]),
    readClaim(identity, ["role"]),
    readClaim(identity, ["metadata", "role"]),
    readClaim(identity, ["public_metadata", "role"]),
    readClaim(identity, ["private_metadata", "role"]),
  ];

  if (roleCandidates.some((value) => typeof value === "string" && ADMIN_ROLES.has(value))) {
    return true;
  }

  const permissions = [
    ...toStringArray(readClaim(identity, ["org_permissions"])),
    ...toStringArray(readClaim(identity, ["permissions"])),
    ...toStringArray(readClaim(identity, ["metadata", "permissions"])),
    ...toStringArray(readClaim(identity, ["public_metadata", "permissions"])),
    ...toStringArray(readClaim(identity, ["private_metadata", "permissions"])),
  ];

  return permissions.includes(ADMIN_PERMISSION);
}

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    throw new Error("Not authenticated");
  }

  if (!isAdminFromIdentity(identity as unknown as Record<string, unknown>)) {
    throw new Error("Not authorized");
  }

  return identity;
}

export const getManagementSnapshot = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [eventTypes, availabilities, reservations, appointments, patients, payments, appointmentEvents] =
      await Promise.all([
        ctx.db.query("event_types").collect(),
        ctx.db.query("availabilities").collect(),
        ctx.db.query("reservations").collect(),
        ctx.db.query("appointments").collect(),
        ctx.db.query("patients").collect(),
        ctx.db.query("payments").collect(),
        ctx.db.query("appointment_events").collect(),
      ]);

    const eventTypeById = new Map(eventTypes.map((item) => [item._id, item]));
    const availabilityById = new Map(availabilities.map((item) => [item._id, item]));

    const recentReservations = [...reservations]
      .sort((a, b) => b.startsAt - a.startsAt)
      .slice(0, 20)
      .map((reservation) => ({
        ...reservation,
        eventTypeTitle: eventTypeById.get(reservation.eventTypeId)?.title ?? "Evento removido",
        availabilityLabel: formatAvailabilityLabel(availabilityById.get(reservation.availabilityId)),
      }));

    const recentAppointmentEvents = [...appointmentEvents]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);

    const availabilityRows = [...availabilities]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 20)
      .map((availability) => ({
        ...availability,
        eventTypeTitle: eventTypeById.get(availability.eventTypeId)?.title ?? "Evento removido",
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

    const users = [...userMap.values()]
      .sort((a, b) => b.latestActivity - a.latestActivity)
      .slice(0, 20);

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
      reservations: recentReservations,
      users,
      payments: recentPayments,
      appointmentEvents: recentAppointmentEvents,
    };
  },
});

export const createEventType = mutation({
  args: {
    slug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    durationMinutes: v.number(),
    location: locationValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

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

    const now = Date.now();
    const eventTypeId = await ctx.db.insert("event_types", {
      slug,
      title: args.title.trim(),
      description: args.description?.trim(),
      durationMinutes: args.durationMinutes,
      location: args.location,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    return { eventTypeId };
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

export const createAvailability = mutation({
  args: {
    eventTypeId: v.id("event_types"),
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
      throw new Error("Horario inicial deve ser menor que o final");
    }

    const now = Date.now();
    const availabilityId = await ctx.db.insert("availabilities", {
      eventTypeId: args.eventTypeId,
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
        weekday: number;
        startTime: string;
        endTime: string;
      }
    | undefined,
) {
  if (!availability) {
    return "Disponibilidade removida";
  }
  return `${availability.weekday} ${availability.startTime}-${availability.endTime}`;
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
