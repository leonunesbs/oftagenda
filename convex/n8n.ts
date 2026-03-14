import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

const appointmentStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("rescheduled"),
  v.literal("cancelled"),
  v.literal("completed"),
);

export const getAppointmentsByPhone = query({
  args: {
    phone: v.string(),
    includeHistory: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const normalizedPhone = normalizePhone(args.phone);
    if (!normalizedPhone) {
      throw new Error("Telefone inválido.");
    }
    const phoneKeys = buildPhoneMatchKeys(args.phone);
    if (phoneKeys.length === 0) {
      throw new Error("Telefone inválido.");
    }
    const phoneKeySet = new Set(phoneKeys);

    const allAppointments = await ctx.db.query("appointments").collect();
    const allReservations = await ctx.db.query("reservations").collect();
    const reservationById = new Map(allReservations.map((item) => [String(item._id), item]));

    const matchedAppointments = allAppointments.filter((appointment) => {
      const appointmentKeys = buildPhoneMatchKeys(appointment.phone);
      return appointmentKeys.some((key) => phoneKeySet.has(key));
    });
    const sorted = [...matchedAppointments].sort((a, b) => b.requestedAt - a.requestedAt);

    const filtered = args.includeHistory
      ? sorted
      : sorted.filter((item) => item.status === "confirmed" || item.status === "rescheduled");

    const appointments = filtered.map((appointment) =>
      mapAppointmentForResponse(appointment, reservationById),
    );

    const activeAppointment =
      appointments.find((item) => item.status === "confirmed" || item.status === "rescheduled") ??
      null;

    return {
      phone: normalizedPhone,
      total: appointments.length,
      activeAppointment,
      appointments,
    };
  },
});

export const cancelAppointmentByPhone = mutation({
  args: {
    appointmentId: v.id("appointments"),
    phone: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedPhone = normalizePhone(args.phone);
    if (!normalizedPhone) {
      throw new Error("Telefone inválido.");
    }

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Agendamento não encontrado.");
    }

    if (!phonesMatch(appointment.phone, normalizedPhone)) {
      throw new Error("Agendamento não corresponde ao telefone informado.");
    }

    if (appointment.status === "completed") {
      throw new Error("Não é possível cancelar uma consulta concluída.");
    }

    const now = Date.now();

    if (appointment.status !== "cancelled") {
      await ctx.db.patch(args.appointmentId, {
        status: "cancelled",
        updatedAt: now,
      });

      if (appointment.reservationId) {
        const reservation = await ctx.db.get(appointment.reservationId);
        if (reservation && (reservation.status === "pending" || reservation.status === "confirmed")) {
          await ctx.db.patch(reservation._id, {
            status: "cancelled",
            notes: "Cancelado via integração n8n.",
            updatedAt: now,
          });
        }
      }

      await ctx.db.insert("appointment_events", {
        appointmentId: appointment._id,
        clerkUserId: appointment.clerkUserId,
        eventType: "cancelled",
        notes: args.reason?.trim() || "Cancelado via integração n8n.",
        createdAt: now,
      });
    }

    const refreshed = await ctx.db.get(args.appointmentId);
    if (!refreshed) {
      throw new Error("Falha ao recarregar agendamento cancelado.");
    }

    return {
      ok: true,
      appointment: mapAppointmentForResponse(refreshed, new Map()),
    };
  },
});

export const updateAppointmentStatusByPhone = mutation({
  args: {
    appointmentId: v.id("appointments"),
    phone: v.string(),
    status: appointmentStatusValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedPhone = normalizePhone(args.phone);
    if (!normalizedPhone) {
      throw new Error("Telefone inválido.");
    }

    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new Error("Agendamento não encontrado.");
    }

    if (!phonesMatch(appointment.phone, normalizedPhone)) {
      throw new Error("Agendamento não corresponde ao telefone informado.");
    }

    const now = Date.now();
    if (appointment.status !== args.status) {
      await ctx.db.patch(appointment._id, {
        status: args.status,
        updatedAt: now,
      });
      await ctx.db.insert("appointment_events", {
        appointmentId: appointment._id,
        clerkUserId: appointment.clerkUserId,
        eventType: mapAppointmentStatusToEventType(args.status),
        notes: args.reason?.trim() || `Status atualizado para ${args.status} via integração n8n.`,
        createdAt: now,
      });
    }

    const refreshed = await ctx.db.get(appointment._id);
    if (!refreshed) {
      throw new Error("Falha ao recarregar agendamento atualizado.");
    }
    return {
      ok: true,
      appointment: mapAppointmentForResponse(refreshed, new Map()),
    };
  },
});

export const getPatientContextByPhone = query({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhone(args.phone);
    if (!phone) {
      return { linked: false, patient: null };
    }

    const link = await ctx.db
      .query("phone_links")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();

    if (!link) {
      return { linked: false, patient: null };
    }

    const patient = await ctx.db
      .query("patients")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", link.clerkUserId),
      )
      .first();

    if (!patient) {
      return { linked: true, patient: null };
    }

    const allAppointments = await ctx.db.query("appointments").collect();
    const userAppointments = allAppointments
      .filter((a) => a.clerkUserId === link.clerkUserId)
      .sort((a, b) => b.requestedAt - a.requestedAt);

    const activeAppointment =
      userAppointments.find(
        (a) => a.status === "confirmed" || a.status === "rescheduled",
      ) ?? null;

    const recentHistory = userAppointments.slice(0, 5).map((a) => ({
      appointmentId: String(a._id),
      location: a.location,
      status: a.status,
      scheduledFor: a.scheduledFor ?? null,
      consultationType: a.consultationType ?? null,
      requestedAt: a.requestedAt,
    }));

    const locationCounts = new Map<string, number>();
    const consultationCounts = new Map<string, number>();
    for (const a of userAppointments) {
      locationCounts.set(a.location, (locationCounts.get(a.location) ?? 0) + 1);
      if (a.consultationType) {
        consultationCounts.set(
          a.consultationType,
          (consultationCounts.get(a.consultationType) ?? 0) + 1,
        );
      }
    }

    const frequentLocation =
      [...locationCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      null;
    const frequentConsultationType =
      [...consultationCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      null;

    const lastCompleted = userAppointments.find(
      (a) => a.status === "completed",
    );

    let triageHighlights = null;
    const appointmentIds = userAppointments.map((a) => a._id);
    if (appointmentIds.length > 0) {
      const allDetails = await ctx.db
        .query("appointment_details")
        .withIndex("by_clerk_user_id", (q) =>
          q.eq("clerkUserId", link.clerkUserId),
        )
        .collect();
      const latestDetail = allDetails.sort(
        (a, b) => b.submittedAt - a.submittedAt,
      )[0];
      if (latestDetail) {
        triageHighlights = {
          conditions: latestDetail.conditions ?? [],
          symptoms: latestDetail.symptoms ?? [],
          lastReason: latestDetail.reason ?? null,
          dilatationLevel: latestDetail.dilatationLevel,
          oneSentenceSummary: latestDetail.oneSentenceSummary ?? null,
        };
      }
    }

    const maskedEmail = maskEmail(patient.email);

    return {
      linked: true,
      patient: {
        name: patient.name,
        email: maskedEmail,
        registeredAt: patient.createdAt,
      },
      summary: {
        totalAppointments: userAppointments.length,
        hasActiveAppointment: activeAppointment !== null,
        lastVisitLocation: lastCompleted?.location ?? null,
        lastVisitDate: lastCompleted?.scheduledFor ?? null,
        frequentLocation,
        frequentConsultationType,
      },
      activeAppointment: activeAppointment
        ? {
            appointmentId: String(activeAppointment._id),
            location: activeAppointment.location,
            status: activeAppointment.status,
            scheduledFor: activeAppointment.scheduledFor ?? null,
            consultationType: activeAppointment.consultationType ?? null,
          }
        : null,
      recentHistory,
      triageHighlights,
    };
  },
});

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

function normalizePhone(rawPhone: string) {
  const candidates = buildPhoneMatchKeys(rawPhone);
  if (candidates.length === 0) {
    return "";
  }
  const canonical = candidates.find((candidate) => candidate.startsWith("55") && candidate.length >= 12);
  return canonical ?? candidates[0] ?? "";
}

function buildPhoneMatchKeys(rawPhone: string) {
  const digitsOnly = rawPhone.replace(/\D/g, "");
  if (digitsOnly.length < 8) {
    return [];
  }

  const keys = new Set<string>();
  const rawCandidates = new Set<string>([
    digitsOnly,
    digitsOnly.replace(/^00+/, ""),
  ]);

  for (const candidate of rawCandidates) {
    if (!candidate || candidate.length < 8) {
      continue;
    }

    keys.add(candidate);
    if (candidate.length > 11) {
      keys.add(candidate.slice(-11));
      keys.add(candidate.slice(-10));
    }

    const withoutCountryCode = candidate.startsWith("55") ? candidate.slice(2) : candidate;
    const withoutTrunkPrefix = withoutCountryCode.replace(/^0+/, "");
    if (!withoutTrunkPrefix) {
      continue;
    }

    keys.add(withoutTrunkPrefix);
    keys.add(`55${withoutTrunkPrefix}`);

    if (withoutTrunkPrefix.length === 10) {
      const withNinthDigit = `${withoutTrunkPrefix.slice(0, 2)}9${withoutTrunkPrefix.slice(2)}`;
      keys.add(withNinthDigit);
      keys.add(`55${withNinthDigit}`);
    }

    if (withoutTrunkPrefix.length === 11 && withoutTrunkPrefix[2] === "9") {
      const withoutNinthDigit = `${withoutTrunkPrefix.slice(0, 2)}${withoutTrunkPrefix.slice(3)}`;
      keys.add(withoutNinthDigit);
      keys.add(`55${withoutNinthDigit}`);
    }
  }

  return [...keys];
}

function phonesMatch(phoneA: string, phoneB: string) {
  const keysA = new Set(buildPhoneMatchKeys(phoneA));
  const keysB = buildPhoneMatchKeys(phoneB);
  return keysB.some((key) => keysA.has(key));
}

function mapAppointmentForResponse(
  appointment: Doc<"appointments">,
  reservationById: Map<string, Doc<"reservations">>,
) {
  const reservation = appointment.reservationId
    ? reservationById.get(String(appointment.reservationId))
    : null;
  return {
    appointmentId: String(appointment._id) as Id<"appointments">,
    clerkUserId: appointment.clerkUserId,
    name: appointment.name,
    phone: appointment.phone,
    email: appointment.email,
    location: appointment.location,
    status: appointment.status,
    requestedAt: appointment.requestedAt,
    scheduledFor: appointment.scheduledFor ?? null,
    consultationType: appointment.consultationType ?? null,
    reservationId: appointment.reservationId ? String(appointment.reservationId) : null,
    reservationStatus: reservation?.status ?? null,
  };
}

function mapAppointmentStatusToEventType(status: Doc<"appointments">["status"]) {
  if (status === "rescheduled") {
    return "rescheduled" as const;
  }
  if (status === "cancelled") {
    return "cancelled" as const;
  }
  if (status === "completed") {
    return "completed" as const;
  }
  return "confirmed" as const;
}
