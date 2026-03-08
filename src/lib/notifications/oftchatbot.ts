import type {
  AppointmentConfirmedNotificationInput,
  NotificationDeliveryResult,
} from "@/lib/notifications/types";

const DEFAULT_OFTCHATBOT_API_BASE_URL = "http://localhost:3030";

function normalizeChatIdFromPhone(rawPhone: string) {
  if (rawPhone.includes("@")) {
    return rawPhone.trim();
  }

  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  if (digits.startsWith("55")) {
    return `${digits}@c.us`;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}@c.us`;
  }

  if (digits.length >= 12) {
    return `${digits}@c.us`;
  }

  return null;
}

function getFirstName(fullName: string) {
  const normalized = fullName.trim();
  if (!normalized) {
    return "paciente";
  }
  const [firstName] = normalized.split(/\s+/);
  return firstName || "paciente";
}

function formatScheduledDateTime(timestamp: number, timezone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: timezone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function getOftchatbotApiBaseUrl() {
  const configured = process.env.OFTCHATBOT_API_BASE_URL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_OFTCHATBOT_API_BASE_URL;
}

function buildAppointmentConfirmationMessage(input: AppointmentConfirmedNotificationInput) {
  const firstName = getFirstName(input.patientName);
  const when = formatScheduledDateTime(input.scheduledFor, input.timezone);
  return [
    `Ola, ${firstName}!`,
    "",
    "Seu agendamento foi confirmado com sucesso.",
    `Consulta: ${input.consultationType}`,
    `Local: ${input.location}`,
    `Data e horario: ${when}`,
    "",
    "Se precisar, responda esta mensagem para falar com nossa equipe.",
  ].join("\n");
}

function parseUnknownBody(body: string) {
  if (!body) {
    return null;
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

export async function sendAppointmentConfirmedNotification(
  input: AppointmentConfirmedNotificationInput,
): Promise<NotificationDeliveryResult> {
  const chatId = normalizeChatIdFromPhone(input.patientPhone);
  if (!chatId) {
    return {
      ok: false,
      status: 400,
      error: "Telefone do paciente invalido para envio no WhatsApp.",
    };
  }

  const apiUrl = new URL("/api/chat/send-text", getOftchatbotApiBaseUrl());

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chatId,
      text: buildAppointmentConfirmationMessage(input),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const rawBody = await response.text();
  const responseBody = parseUnknownBody(rawBody);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      chatId,
      error: `Falha ao enviar mensagem via oftchatbot (status ${response.status}).`,
      responseBody,
    };
  }

  return {
    ok: true,
    status: response.status,
    chatId,
    responseBody,
  };
}
