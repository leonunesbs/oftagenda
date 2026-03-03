"use server";

import { revalidatePath } from "next/cache";

import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";
import { requireAdmin } from "@/lib/access";

const ADMIN_PATH = "/dashboard/admin";

function toNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toCentsFromReais(value: FormDataEntryValue | null, fallback = 0) {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) {
    return fallback;
  }
  const reais = Number(normalized);
  if (!Number.isFinite(reais)) {
    return fallback;
  }
  return Math.round(reais * 100);
}

export async function createEventTypeAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.createEventType, {
    slug: toStringValue(formData.get("slug")),
    name: toStringValue(formData.get("name")),
    address: toStringValue(formData.get("address")),
    notes: toStringValue(formData.get("notes")) || undefined,
    kind: (toStringValue(formData.get("kind")) || "consulta") as "consulta" | "procedimento" | "exame",
    durationMinutes: toNumber(formData.get("durationMinutes"), 30),
    priceCents: toCentsFromReais(formData.get("priceReais"), 0),
    stripePriceId:
      toStringValue(formData.get("stripePriceId")) || toStringValue(formData.get("priceId")) || undefined,
    availabilityId: toStringValue(formData.get("availabilityId")) as Id<"availabilities">,
    location: (toStringValue(formData.get("location")) || "fortaleza") as
      | "fortaleza"
      | "sao_domingos_do_maranhao"
      | "fortuna",
  });
  revalidatePath(ADMIN_PATH);
}

export async function setEventTypeActiveAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.setEventTypeActive, {
    eventTypeId: toStringValue(formData.get("eventTypeId")) as Id<"event_types">,
    active: toStringValue(formData.get("active")) === "true",
  });
  revalidatePath(ADMIN_PATH);
}

export async function updateEventTypeAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.updateEventType, {
    eventTypeId: toStringValue(formData.get("eventTypeId")) as Id<"event_types">,
    slug: toStringValue(formData.get("slug")),
    name: toStringValue(formData.get("name")),
    address: toStringValue(formData.get("address")),
    notes: toStringValue(formData.get("notes")) || undefined,
    kind: (toStringValue(formData.get("kind")) || "consulta") as "consulta" | "procedimento" | "exame",
    durationMinutes: toNumber(formData.get("durationMinutes"), 30),
    priceCents: toCentsFromReais(formData.get("priceReais"), 0),
    stripePriceId:
      toStringValue(formData.get("stripePriceId")) || toStringValue(formData.get("priceId")) || undefined,
    availabilityId: toStringValue(formData.get("availabilityId")) as Id<"availabilities">,
    location: (toStringValue(formData.get("location")) || "fortaleza") as
      | "fortaleza"
      | "sao_domingos_do_maranhao"
      | "fortuna",
    active: toStringValue(formData.get("active")) === "true",
  });
  revalidatePath(ADMIN_PATH);
}

export async function deleteEventTypeAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.deleteEventType, {
    eventTypeId: toStringValue(formData.get("eventTypeId")) as Id<"event_types">,
  });
  revalidatePath(ADMIN_PATH);
}

export async function createAvailabilityAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.createAvailability, {
    name: toStringValue(formData.get("name")) || "Disponibilidade",
    weekday: toNumber(formData.get("weekday"), 1),
    startTime: toStringValue(formData.get("startTime")),
    endTime: toStringValue(formData.get("endTime")),
    timezone: toStringValue(formData.get("timezone")) || "America/Fortaleza",
  });
  revalidatePath(ADMIN_PATH);
}

export async function updateAvailabilityAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.updateAvailability, {
    availabilityId: toStringValue(formData.get("availabilityId")) as Id<"availabilities">,
    name: toStringValue(formData.get("name")) || "Disponibilidade",
    weekday: toNumber(formData.get("weekday"), 1),
    startTime: toStringValue(formData.get("startTime")),
    endTime: toStringValue(formData.get("endTime")),
    timezone: toStringValue(formData.get("timezone")) || "America/Fortaleza",
    status: (toStringValue(formData.get("status")) || "active") as "active" | "inactive",
  });
  revalidatePath(ADMIN_PATH);
}

export async function deleteAvailabilityAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.deleteAvailability, {
    availabilityId: toStringValue(formData.get("availabilityId")) as Id<"availabilities">,
  });
  revalidatePath(ADMIN_PATH);
}

export async function setAvailabilityStatusAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.setAvailabilityStatus, {
    availabilityId: toStringValue(formData.get("availabilityId")) as Id<"availabilities">,
    status: (toStringValue(formData.get("status")) || "active") as "active" | "inactive",
  });
  revalidatePath(ADMIN_PATH);
}

export async function setAvailabilityWeekdayStatusAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.setAvailabilityWeekdayStatus, {
    availabilityId: toStringValue(formData.get("availabilityId")) as Id<"availabilities">,
    status: (toStringValue(formData.get("status")) || "active") as "active" | "inactive",
  });
  revalidatePath(ADMIN_PATH);
}

export async function upsertAvailabilityDaySlotsAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();

  const rawSlots = toStringValue(formData.get("slots"));
  let parsedSlots: Array<{
    availabilityId?: Id<"availabilities">;
    startTime: string;
    endTime: string;
    status: "active" | "inactive";
  }> = [];

  if (rawSlots) {
    try {
      const parsed = JSON.parse(rawSlots) as Array<{
        availabilityId?: string;
        startTime: string;
        endTime: string;
        status: "active" | "inactive";
      }>;
      parsedSlots = parsed.map((slot) => ({
        availabilityId: slot.availabilityId as Id<"availabilities"> | undefined,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
      }));
    } catch {
      throw new Error("Payload de faixas invalido");
    }
  }

  await client.mutation(api.admin.upsertAvailabilityDaySlots, {
    groupName: toStringValue(formData.get("groupName")) || "Disponibilidade",
    weekday: toNumber(formData.get("weekday"), 1),
    timezone: toStringValue(formData.get("timezone")) || "America/Fortaleza",
    slots: parsedSlots,
  });

  revalidatePath(ADMIN_PATH);
}

export async function upsertAvailabilityDateOverridesAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();

  const rawDates = toStringValue(formData.get("dates"));
  const rawSlots = toStringValue(formData.get("slots"));
  let parsedDates: string[] = [];
  let parsedSlots: Array<{
    startTime: string;
    endTime: string;
    status: "active" | "inactive";
  }> = [];

  if (rawDates) {
    try {
      const parsed = JSON.parse(rawDates) as string[];
      parsedDates = parsed.filter((date) => typeof date === "string").map((date) => date.trim());
    } catch {
      throw new Error("Payload de datas invalido");
    }
  }

  if (rawSlots) {
    try {
      const parsed = JSON.parse(rawSlots) as Array<{
        startTime: string;
        endTime: string;
        status: "active" | "inactive";
      }>;
      parsedSlots = parsed.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
      }));
    } catch {
      throw new Error("Payload de faixas invalido");
    }
  }

  await client.mutation(api.admin.upsertAvailabilityDateOverrides, {
    groupName: toStringValue(formData.get("groupName")) || "Disponibilidade",
    timezone: toStringValue(formData.get("timezone")) || "America/Fortaleza",
    dates: parsedDates,
    allDayUnavailable: toStringValue(formData.get("allDayUnavailable")) === "true",
    slots: parsedSlots,
  });

  revalidatePath(ADMIN_PATH);
}

export async function deleteAvailabilityDateOverrideAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.deleteAvailabilityDateOverride, {
    overrideId: toStringValue(formData.get("overrideId")) as Id<"availability_overrides">,
  });
  revalidatePath(ADMIN_PATH);
}

export async function createReservationAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.createReservation, {
    clerkUserId: toStringValue(formData.get("clerkUserId")),
    eventTypeId: toStringValue(formData.get("eventTypeId")) as Id<"event_types">,
    availabilityId: toStringValue(formData.get("availabilityId")) as Id<"availabilities">,
    date: toStringValue(formData.get("date")),
    time: toStringValue(formData.get("time")),
    status: (toStringValue(formData.get("status")) || "pending") as
      | "pending"
      | "confirmed"
      | "cancelled"
      | "completed",
    notes: toStringValue(formData.get("notes")) || undefined,
  });
  revalidatePath(ADMIN_PATH);
}

export async function updateReservationAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.updateReservation, {
    reservationId: toStringValue(formData.get("reservationId")) as Id<"reservations">,
    clerkUserId: toStringValue(formData.get("clerkUserId")),
    eventTypeId: toStringValue(formData.get("eventTypeId")) as Id<"event_types">,
    availabilityId: toStringValue(formData.get("availabilityId")) as Id<"availabilities">,
    date: toStringValue(formData.get("date")),
    time: toStringValue(formData.get("time")),
    status: (toStringValue(formData.get("status")) || "pending") as
      | "pending"
      | "confirmed"
      | "cancelled"
      | "completed",
    notes: toStringValue(formData.get("notes")) || undefined,
  });
  revalidatePath(ADMIN_PATH);
}

export async function deleteReservationAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.deleteReservation, {
    reservationId: toStringValue(formData.get("reservationId")) as Id<"reservations">,
  });
  revalidatePath(ADMIN_PATH);
}

export async function setReservationStatusAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.setReservationStatus, {
    reservationId: toStringValue(formData.get("reservationId")) as Id<"reservations">,
    status: (toStringValue(formData.get("status")) || "pending") as
      | "pending"
      | "confirmed"
      | "cancelled"
      | "completed",
    notes: toStringValue(formData.get("notes")) || undefined,
  });
  revalidatePath(ADMIN_PATH);
}

export async function createPaymentAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  const reservationId = toStringValue(formData.get("reservationId"));
  await client.mutation(api.admin.createPayment, {
    reservationId: reservationId ? (reservationId as Id<"reservations">) : undefined,
    clerkUserId: toStringValue(formData.get("clerkUserId")) || undefined,
    amountCents: toNumber(formData.get("amountCents"), 0),
    currency: toStringValue(formData.get("currency")) || "BRL",
    method: (toStringValue(formData.get("method")) || "pix") as
      | "pix"
      | "card"
      | "cash"
      | "transfer",
    status: (toStringValue(formData.get("status")) || "pending") as
      | "pending"
      | "paid"
      | "refunded"
      | "failed",
    externalId: toStringValue(formData.get("externalId")) || undefined,
    notes: toStringValue(formData.get("notes")) || undefined,
  });
  revalidatePath(ADMIN_PATH);
}

export async function setPaymentStatusAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.setPaymentStatus, {
    paymentId: toStringValue(formData.get("paymentId")) as Id<"payments">,
    status: (toStringValue(formData.get("status")) || "pending") as
      | "pending"
      | "paid"
      | "refunded"
      | "failed",
    notes: toStringValue(formData.get("notes")) || undefined,
  });
  revalidatePath(ADMIN_PATH);
}
