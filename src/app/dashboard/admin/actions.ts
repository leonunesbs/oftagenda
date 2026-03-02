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

export async function createEventTypeAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.createEventType, {
    slug: toStringValue(formData.get("slug")),
    title: toStringValue(formData.get("title")),
    description: toStringValue(formData.get("description")) || undefined,
    durationMinutes: toNumber(formData.get("durationMinutes"), 30),
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

export async function createAvailabilityAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.createAvailability, {
    eventTypeId: toStringValue(formData.get("eventTypeId")) as Id<"event_types">,
    weekday: toNumber(formData.get("weekday"), 1),
    startTime: toStringValue(formData.get("startTime")),
    endTime: toStringValue(formData.get("endTime")),
    timezone: toStringValue(formData.get("timezone")) || "America/Fortaleza",
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
