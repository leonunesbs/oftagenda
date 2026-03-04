import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const bookingLocationValidator = v.string();

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
    location: bookingLocationValidator,
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

    const activeEventTypes = await ctx.db
      .query("event_types")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    const selectedEventType = activeEventTypes.find((item) => item.slug === args.location);
    if (!selectedEventType) {
      throw new Error("Local selecionado nao encontrado");
    }

    const appointmentId = await ctx.db.insert("appointments", {
      clerkUserId,
      patientId: patient._id,
      name: args.name,
      phone: args.phone,
      email: args.email,
      location: selectedEventType.location,
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
    location: bookingLocationValidator,
    daysAhead: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysAhead = clampDaysAhead(args.daysAhead ?? 14);
    const activeEventTypes = await ctx.db
      .query("event_types")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();

    const eventTypes = activeEventTypes.filter(
      (item) =>
        item.slug === args.location &&
        Boolean(item.availabilityId) &&
        hasCheckoutPricingConfigured(item),
    );
    if (eventTypes.length === 0) {
      return { location: args.location, dates: [] };
    }

    const [allAvailabilities, allOverrides] = await Promise.all([
      ctx.db.query("availabilities").collect(),
      ctx.db.query("availability_overrides").collect(),
    ]);
    const availabilityById = new Map(allAvailabilities.map((item) => [String(item._id), item]));
    const durationByEventType = new Map(eventTypes.map((item) => [item._id, item.durationMinutes]));
    const availabilityGroupsByEventType = new Map(
      eventTypes.map((eventType) => [
        String(eventType._id),
        eventType.availabilityId
          ? resolveAvailabilityGroupName(availabilityById.get(String(eventType.availabilityId)))
          : null,
      ]),
    );
    const activeGroupNames = new Set(
      [...availabilityGroupsByEventType.values()].filter(
        (groupName): groupName is string => typeof groupName === "string" && groupName.length > 0,
      ),
    );
    if (activeGroupNames.size === 0) {
      return { location: args.location, dates: [] };
    }

    const eventTypeByGroupName = new Map<string, (typeof eventTypes)[number]>();
    for (const eventType of eventTypes) {
      const groupName = availabilityGroupsByEventType.get(String(eventType._id));
      if (groupName && !eventTypeByGroupName.has(groupName)) {
        eventTypeByGroupName.set(groupName, eventType);
      }
    }

    const availabilities = allAvailabilities.filter(
      (item) => item.status === "active" && activeGroupNames.has(resolveAvailabilityGroupName(item)),
    );

    if (availabilities.length === 0) {
      return { location: args.location, dates: [] };
    }

    const availabilityByGroup = new Map<string, typeof availabilities>();
    for (const availability of availabilities) {
      const groupName = resolveAvailabilityGroupName(availability);
      const current = availabilityByGroup.get(groupName) ?? [];
      current.push(availability);
      availabilityByGroup.set(groupName, current);
    }

    const relevantOverrides = allOverrides.filter((override) => activeGroupNames.has(override.groupName));
    const overrideByGroupDate = new Map(
      relevantOverrides.map((override) => [buildOverrideKey(override.groupName, override.date), override]),
    );

    const allReservations = await ctx.db.query("reservations").collect();
    const reservations = allReservations.filter(
      (item) =>
        eventTypes.some((eventType) => eventType._id === item.eventTypeId) &&
        (item.status === "pending" || item.status === "confirmed"),
    );

    const reservedSlots = new Set<string>();
    for (const reservation of reservations) {
      const availability = availabilityById.get(String(reservation.availabilityId));
      if (!availability) {
        continue;
      }
      const groupName = resolveAvailabilityGroupName(availability);
      const dateKey = formatDateInTimezone(reservation.startsAt, availability.timezone);
      const timeKey = formatTimeInTimezone(reservation.startsAt, availability.timezone);
      reservedSlots.add(buildSlotKey(groupName, dateKey, timeKey));
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

      for (const groupName of activeGroupNames) {
        const assignedEventType = eventTypeByGroupName.get(groupName);
        const duration = assignedEventType ? durationByEventType.get(assignedEventType._id) ?? 30 : 30;

        const override = overrideByGroupDate.get(buildOverrideKey(groupName, isoDate));
        if (override) {
          if (override.allDayUnavailable) {
            continue;
          }
          const activeOverrideSlots = override.slots.filter((slot) => slot.status === "active");
          for (const overrideSlot of activeOverrideSlots) {
            const generatedSlots = buildSlotsWithinRange(
              overrideSlot.startTime,
              overrideSlot.endTime,
              duration,
            );
            for (const slot of generatedSlots) {
              const key = buildSlotKey(groupName, isoDate, slot);
              if (reservedSlots.has(key)) {
                continue;
              }
              daySlots.add(slot);
            }
          }
          continue;
        }

        const weeklySlots = (availabilityByGroup.get(groupName) ?? []).filter(
          (availability) => availability.weekday === weekday,
        );
        for (const availability of weeklySlots) {
          const slots = buildSlotsWithinRange(availability.startTime, availability.endTime, duration);
          for (const slot of slots) {
            const key = buildSlotKey(groupName, isoDate, slot);
            if (reservedSlots.has(key)) {
              continue;
            }
            daySlots.add(slot);
          }
        }
      }

      const times = [...daySlots].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
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

export const getActiveBookingLocations = query({
  args: {},
  handler: async (ctx) => {
    const eventTypes = await ctx.db
      .query("event_types")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return [...eventTypes]
      .filter(
        (eventType) =>
          Boolean(eventType.availabilityId) &&
          hasCheckoutPricingConfigured(eventType),
      )
      .sort((a, b) => (a.name ?? a.title).localeCompare(b.name ?? b.title, "pt-BR"))
      .map((eventType) => ({
        value: eventType.slug,
        label: `${eventType.name ?? eventType.title}${eventType.address ? ` - ${eventType.address}` : ""}`,
      }));
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

function buildSlotKey(groupName: string, isoDate: string, time: string) {
  return `${groupName}|${isoDate}|${time}`;
}

function buildOverrideKey(groupName: string, isoDate: string) {
  return `${groupName}|${isoDate}`;
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

function hasCheckoutPricingConfigured(eventType: { stripePriceId?: string; priceCents?: number }) {
  const stripePriceId = eventType.stripePriceId?.trim();
  if (stripePriceId?.startsWith("price_")) {
    return true;
  }
  const normalizedPriceCents = normalizeAmountCents(eventType.priceCents);
  if (typeof normalizedPriceCents === "number" && normalizedPriceCents > 0) {
    return true;
  }
  if (!stripePriceId) {
    return false;
  }

  if (/^\d+$/.test(stripePriceId)) {
    const parsedInteger = Number(stripePriceId);
    return Number.isFinite(parsedInteger) && parsedInteger > 0;
  }
  const parsed = Number(stripePriceId.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0;
}

function normalizeAmountCents(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
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
