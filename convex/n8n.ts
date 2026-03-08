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

    const allAppointments = await ctx.db.query("appointments").collect();
    const allReservations = await ctx.db.query("reservations").collect();
    const reservationById = new Map(allReservations.map((item) => [String(item._id), item]));

    const matchedAppointments = allAppointments.filter((appointment) =>
      normalizePhone(appointment.phone) === normalizedPhone,
    );
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

    if (normalizePhone(appointment.phone) !== normalizedPhone) {
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

    if (normalizePhone(appointment.phone) !== normalizedPhone) {
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

function normalizePhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : "";
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
