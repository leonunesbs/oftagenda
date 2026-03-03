import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

const appointmentStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("rescheduled"),
  v.literal("cancelled"),
  v.literal("completed"),
);

const triageReasonValidator = v.union(
  v.literal("routine"),
  v.literal("glasses"),
  v.literal("blurred"),
  v.literal("pain"),
  v.literal("retina_follow"),
  v.literal("glaucoma_follow"),
  v.literal("postop"),
  v.literal("other"),
);

const conditionValidator = v.union(
  v.literal("diabetes"),
  v.literal("hypertension"),
  v.literal("glaucoma"),
  v.literal("prior_surgery"),
);

const symptomValidator = v.union(
  v.literal("floaters"),
  v.literal("flashes"),
  v.literal("sudden_loss"),
);

const lastDilationValidator = v.union(
  v.literal("lt6m"),
  v.literal("6to12m"),
  v.literal("gt1y"),
  v.literal("unknown"),
);

const eventTypeValidator = v.union(
  v.literal("created"),
  v.literal("confirmed"),
  v.literal("rescheduled"),
  v.literal("cancelled"),
  v.literal("completed"),
  v.literal("details_submitted"),
);

const availabilityStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
);
const availabilityOverrideSlotValidator = v.object({
  startTime: v.string(),
  endTime: v.string(),
  status: availabilityStatusValidator,
});

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

const adminEventKindValidator = v.union(
  v.literal("consulta"),
  v.literal("procedimento"),
  v.literal("exame"),
);

export default defineSchema({
  event_types: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
    kind: v.optional(adminEventKindValidator),
    durationMinutes: v.number(),
    priceCents: v.optional(v.number()),
    stripePriceId: v.optional(v.string()),
    location: locationValidator,
    availabilityId: v.optional(v.id("availabilities")),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["active"])
    .index("by_availability_id", ["availabilityId"]),

  availabilities: defineTable({
    name: v.optional(v.string()),
    weekday: v.number(),
    startTime: v.string(),
    endTime: v.string(),
    timezone: v.string(),
    status: availabilityStatusValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_weekday", ["weekday"])
    .index("by_status", ["status"]),

  availability_overrides: defineTable({
    groupName: v.string(),
    date: v.string(),
    timezone: v.string(),
    allDayUnavailable: v.boolean(),
    slots: v.array(availabilityOverrideSlotValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_group_name", ["groupName"])
    .index("by_group_name_and_date", ["groupName", "date"]),

  reservations: defineTable({
    clerkUserId: v.string(),
    eventTypeId: v.id("event_types"),
    availabilityId: v.id("availabilities"),
    appointmentId: v.optional(v.id("appointments")),
    startsAt: v.number(),
    endsAt: v.number(),
    status: reservationStatusValidator,
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_event_type_id", ["eventTypeId"])
    .index("by_availability_id", ["availabilityId"])
    .index("by_clerk_user_id_and_starts_at", ["clerkUserId", "startsAt"]),

  payments: defineTable({
    clerkUserId: v.string(),
    reservationId: v.optional(v.id("reservations")),
    amountCents: v.number(),
    currency: v.string(),
    method: paymentMethodValidator,
    status: paymentStatusValidator,
    externalId: v.optional(v.string()),
    lastStripeEventId: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_reservation_id", ["reservationId"])
    .index("by_external_id", ["externalId"])
    .index("by_status", ["status"]),

  stripe_webhook_events: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    paymentId: v.optional(v.id("payments")),
    reservationId: v.optional(v.id("reservations")),
    status: v.union(
      v.literal("ignored"),
      v.literal("processed"),
      v.literal("duplicate"),
      v.literal("failed"),
    ),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event_id", ["eventId"])
    .index("by_created_at", ["createdAt"]),

  patients: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  appointments: defineTable({
    clerkUserId: v.string(),
    patientId: v.optional(v.id("patients")),
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    location: locationValidator,
    eventTypeId: v.optional(v.id("event_types")),
    reservationId: v.optional(v.id("reservations")),
    preferredPeriod: periodValidator,
    reason: v.optional(v.string()),
    status: appointmentStatusValidator,
    requestedAt: v.number(),
    scheduledFor: v.optional(v.number()),
    consultationType: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_clerk_user_id_and_status", ["clerkUserId", "status"])
    .index("by_clerk_user_id_and_requested_at", ["clerkUserId", "requestedAt"]),

  appointment_details: defineTable({
    appointmentId: v.id("appointments"),
    clerkUserId: v.string(),
    reason: triageReasonValidator,
    conditions: v.array(conditionValidator),
    symptoms: v.array(symptomValidator),
    lastDilation: lastDilationValidator,
    oneSentenceSummary: v.optional(v.string()),
    dilatationLevel: v.union(v.literal("ALTA"), v.literal("POSSIVEL"), v.literal("BAIXA")),
    dilatationScore: v.number(),
    submittedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_appointment_id", ["appointmentId"])
    .index("by_clerk_user_id", ["clerkUserId"]),

  appointment_events: defineTable({
    appointmentId: v.id("appointments"),
    clerkUserId: v.string(),
    eventType: eventTypeValidator,
    notes: v.optional(v.string()),
    payload: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_appointment_id", ["appointmentId"])
    .index("by_clerk_user_id_and_created_at", ["clerkUserId", "createdAt"]),
});
