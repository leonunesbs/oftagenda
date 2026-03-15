"use server";

import { revalidatePath } from "next/cache";

import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";
import { sendReservationLifecycleEmail } from "@/lib/email/resend";
import type { ReservationStatus } from "@/lib/reservation-status";
import { isReservationStatus } from "@/lib/reservation-status";
import { requireAdmin } from "@/lib/access";

const ADMIN_PATH = "/dashboard/admin";

function toNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseReservationStatus(value: FormDataEntryValue | null, fallback: ReservationStatus = "pending") {
  const normalized = toStringValue(value);
  return isReservationStatus(normalized) ? normalized : fallback;
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

function formatDateTimeForEmail({
  timestamp,
  date,
  time,
}: {
  timestamp?: number;
  date?: string;
  time?: string;
}) {
  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "full",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(timestamp));
  }
  if (date && time) {
    return `${date} às ${time}`;
  }
  return "Horário indisponível";
}

async function notifyReservationUpdateEmail({
  to,
  patientName,
  subject,
  title,
  summary,
  details,
}: {
  to: string;
  patientName?: string;
  subject: string;
  title: string;
  summary: string;
  details: string[];
}) {
  if (!to) {
    return;
  }
  try {
    await sendReservationLifecycleEmail({
      to,
      patientName,
      subject,
      title,
      summary,
      details,
    });
  } catch (error) {
    console.error("Falha ao enviar email transacional de reserva", error);
  }
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
    paymentMode: (toStringValue(formData.get("paymentMode")) || "booking_fee") as
      | "booking_fee"
      | "full_payment"
      | "in_person",
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
    paymentMode: (toStringValue(formData.get("paymentMode")) || "booking_fee") as
      | "booking_fee"
      | "full_payment"
      | "in_person",
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
    previousGroupName: toStringValue(formData.get("previousGroupName")) || undefined,
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
    status: parseReservationStatus(formData.get("status")),
    notes: toStringValue(formData.get("notes")) || undefined,
  });
  revalidatePath(ADMIN_PATH);
}

export async function updateReservationAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  const reservationId = toStringValue(formData.get("reservationId")) as Id<"reservations">;
  const clerkUserId = toStringValue(formData.get("clerkUserId"));
  const eventTypeId = toStringValue(formData.get("eventTypeId")) as Id<"event_types">;
  const availabilityId = toStringValue(formData.get("availabilityId")) as Id<"availabilities">;
  const date = toStringValue(formData.get("date"));
  const time = toStringValue(formData.get("time"));
  const status = parseReservationStatus(formData.get("status"));
  const notes = toStringValue(formData.get("notes")) || undefined;

  const result = await client.mutation(api.admin.updateReservation, {
    reservationId,
    clerkUserId,
    eventTypeId,
    availabilityId,
    date,
    time,
    status,
    notes,
  });
  const effectiveStatus = result.status ?? status;

  const notifyEmail = toStringValue(formData.get("notifyEmail"));
  const notifyName = toStringValue(formData.get("notifyName"));
  const eventTypeTitle = toStringValue(formData.get("eventTypeTitle")) || "Consulta oftalmológica";
  if (notifyEmail) {
    await notifyReservationUpdateEmail({
      to: notifyEmail,
      patientName: notifyName,
      subject: "Seu agendamento foi atualizado",
      title: "Atualização do seu agendamento",
      summary: "Houve uma atualização no seu atendimento pela equipe administrativa.",
      details: [
        `Atendimento: ${eventTypeTitle}`,
        `Novo horário: ${formatDateTimeForEmail({ date, time })}`,
        `Status atual: ${effectiveStatus}`,
        notes ? `Observações: ${notes}` : "Observações: sem observações adicionais",
      ],
    });
  }
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
  const reservationId = toStringValue(formData.get("reservationId")) as Id<"reservations">;
  const status = parseReservationStatus(formData.get("status"));
  const notes = toStringValue(formData.get("notes")) || undefined;
  const result = await client.mutation(api.admin.setReservationStatus, {
    reservationId,
    status,
    notes,
  });
  const effectiveStatus = result.status ?? status;

  const notifyEmail = toStringValue(formData.get("notifyEmail"));
  const notifyName = toStringValue(formData.get("notifyName"));
  const eventTypeTitle = toStringValue(formData.get("eventTypeTitle")) || "Consulta oftalmológica";
  const scheduledAtRaw = toStringValue(formData.get("scheduledAt"));
  const scheduledAt = scheduledAtRaw ? Number(scheduledAtRaw) : undefined;
  if (notifyEmail) {
    await notifyReservationUpdateEmail({
      to: notifyEmail,
      patientName: notifyName,
      subject: `Status do seu agendamento: ${effectiveStatus}`,
      title: "Mudança de status do agendamento",
      summary: "Atualizamos o status do seu atendimento.",
      details: [
        `Atendimento: ${eventTypeTitle}`,
        `Horário: ${formatDateTimeForEmail({ timestamp: scheduledAt })}`,
        `Novo status: ${effectiveStatus}`,
        notes ? `Observações: ${notes}` : "Observações: sem observações adicionais",
      ],
    });
  }
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

export async function linkWhatsappToUserAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  await client.mutation(api.admin.adminLinkWhatsappToUser, {
    clerkUserId: toStringValue(formData.get("clerkUserId")),
    phone: toStringValue(formData.get("phone")),
  });
  revalidatePath(ADMIN_PATH);
}

export async function adminCreateAppointmentAction(formData: FormData) {
  await requireAdmin(ADMIN_PATH);
  const { client } = await getAuthenticatedConvexHttpClient();
  const clerkUserId = toStringValue(formData.get("clerkUserId")) || undefined;
  const name = toStringValue(formData.get("name"));
  const phone = toStringValue(formData.get("phone"));
  const email = toStringValue(formData.get("email"));
  const eventTypeId = toStringValue(formData.get("eventTypeId")) as Id<"event_types">;
  const availabilityId = toStringValue(formData.get("availabilityId")) as Id<"availabilities">;
  const date = toStringValue(formData.get("date"));
  const time = toStringValue(formData.get("time"));
  const preferredPeriod = (toStringValue(formData.get("preferredPeriod")) || "qualquer") as
    | "manha"
    | "tarde"
    | "noite"
    | "qualquer";
  const reason = toStringValue(formData.get("reason")) || undefined;
  const notes = toStringValue(formData.get("notes")) || undefined;

  await client.mutation(api.admin.adminCreateAppointment, {
    clerkUserId,
    name,
    phone,
    email,
    eventTypeId,
    availabilityId,
    date,
    time,
    preferredPeriod,
    reason,
    notes,
  });

  const snapshot = await client.query(api.admin.getManagementSnapshot, {});
  const eventTypeTitle =
    snapshot.eventTypes.find((eventType) => String(eventType._id) === String(eventTypeId))?.name ??
    snapshot.eventTypes.find((eventType) => String(eventType._id) === String(eventTypeId))?.title ??
    "Consulta oftalmológica";

  await notifyReservationUpdateEmail({
    to: email,
    patientName: name,
    subject: "Seu agendamento foi confirmado",
    title: "Agendamento confirmado pela clínica",
    summary: "Sua marcação foi registrada com sucesso.",
    details: [
      `Atendimento: ${eventTypeTitle}`,
      `Data e horário: ${formatDateTimeForEmail({ date, time })}`,
      `Telefone para contato: ${phone}`,
      reason ? `Motivo informado: ${reason}` : "Motivo informado: não informado",
    ],
  });

  revalidatePath(ADMIN_PATH);
  revalidatePath("/dashboard/admin/agenda");
}
