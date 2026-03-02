import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const locationValidator = v.union(
  v.literal("fortaleza"),
  v.literal("sao_domingos_do_maranhao"),
  v.literal("fortuna"),
);

const periodValidator = v.union(
  v.literal("manha"),
  v.literal("tarde"),
  v.literal("noite"),
  v.literal("qualquer"),
);

export const confirmBooking = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    location: locationValidator,
    preferredPeriod: periodValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const clerkUserId = identity.subject;
    const patient = await findOrCreatePatient(ctx, clerkUserId, args.name, args.phone, args.email, now);

    const appointmentId = await ctx.db.insert("appointments", {
      clerkUserId,
      patientId: patient._id,
      name: args.name,
      phone: args.phone,
      email: args.email,
      location: args.location,
      preferredPeriod: args.preferredPeriod,
      reason: args.reason,
      status: "confirmed",
      requestedAt: now,
      updatedAt: now,
      consultationType: "Consulta oftalmologica",
    });

    await ctx.db.insert("appointment_events", {
      appointmentId,
      clerkUserId,
      eventType: "confirmed",
      notes: "Solicitacao confirmada via fluxo sem atrito.",
      createdAt: now,
    });

    return { appointmentId, status: "confirmed" as const };
  },
});

export const hasConfirmedBooking = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return false;
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .collect();

    return appointments.some((item) => item.status === "confirmed" || item.status === "rescheduled");
  },
});

export const getBookingOptionsByLocation = query({
  args: {
    location: locationValidator,
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAhead = clampDaysAhead(args.daysAhead ?? 14);
    const activeEventTypes = await ctx.db
      .query("event_types")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    const eventTypes = activeEventTypes.filter((item) => item.location === args.location);
    if (eventTypes.length === 0) {
      return { location: args.location, dates: [] };
    }

    const eventTypeIds = new Set(eventTypes.map((item) => item._id));
    const durationByEventType = new Map(eventTypes.map((item) => [item._id, item.durationMinutes]));

    const allAvailabilities = await ctx.db.query("availabilities").collect();
    const availabilities = allAvailabilities.filter(
      (item) => item.status === "active" && eventTypeIds.has(item.eventTypeId),
    );

    if (availabilities.length === 0) {
      return { location: args.location, dates: [] };
    }

    const availabilityById = new Map(availabilities.map((item) => [item._id, item]));
    const allReservations = await ctx.db.query("reservations").collect();
    const reservations = allReservations.filter(
      (item) =>
        eventTypeIds.has(item.eventTypeId) &&
        (item.status === "pending" || item.status === "confirmed"),
    );

    const reservedSlots = new Set<string>();
    for (const reservation of reservations) {
      const availability = availabilityById.get(reservation.availabilityId);
      if (!availability) {
        continue;
      }
      const dateKey = formatDateInTimezone(reservation.startsAt, availability.timezone);
      const timeKey = formatTimeInTimezone(reservation.startsAt, availability.timezone);
      reservedSlots.add(buildSlotKey(String(reservation.availabilityId), dateKey, timeKey));
    }

    const today = new Date();
    const dates: Array<{
      isoDate: string;
      label: string;
      weekdayLabel: string;
      times: string[];
    }> = [];

    for (let offset = 0; offset < daysAhead; offset += 1) {
      const day = new Date(today);
      day.setDate(today.getDate() + offset);

      const isoDate = toIsoDate(day);
      const weekday = day.getDay();
      const daySlots = new Set<string>();

      for (const availability of availabilities) {
        if (availability.weekday !== weekday) {
          continue;
        }

        const duration = durationByEventType.get(availability.eventTypeId) ?? 30;
        const slots = buildSlotsWithinRange(availability.startTime, availability.endTime, duration);
        for (const slot of slots) {
          const key = buildSlotKey(String(availability._id), isoDate, slot);
          if (reservedSlots.has(key)) {
            continue;
          }
          daySlots.add(slot);
        }
      }

      const times = [...daySlots].sort((a, b) => a.localeCompare(b));
      if (times.length === 0) {
        continue;
      }

      dates.push({
        isoDate,
        label: day.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        weekdayLabel: day.toLocaleDateString("pt-BR", { weekday: "short" }),
        times,
      });
    }

    return { location: args.location, dates };
  },
});

export const getDashboardState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .collect();

    const sorted = [...appointments].sort((a, b) => b.requestedAt - a.requestedAt);
    const nextAppointment =
      sorted.find((item) => item.status === "confirmed" || item.status === "rescheduled") ?? null;

    return {
      hasConfirmedBooking: nextAppointment !== null,
      nextAppointment,
      history: sorted.slice(0, 8),
    };
  },
});

export const getLatestActiveAppointment = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .collect();

    const sorted = [...appointments].sort((a, b) => b.requestedAt - a.requestedAt);
    return (
      sorted.find((item) => item.status === "confirmed" || item.status === "rescheduled") ?? null
    );
  },
});

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

  const created = await ctx.db.get(patientId);
  if (!created) {
    throw new Error("Could not create patient");
  }
  return created as Doc<"patients">;
}

function clampDaysAhead(value: number) {
  if (value < 1) {
    return 1;
  }
  if (value > 30) {
    return 30;
  }
  return Math.floor(value);
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function buildSlotKey(availabilityId: string, isoDate: string, time: string) {
  return `${availabilityId}|${isoDate}|${time}`;
}
