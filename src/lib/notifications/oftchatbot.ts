import type {
  AppointmentConfirmedNotificationInput,
  NotificationDeliveryResult,
} from "@/lib/notifications/types";

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
  return configured && configured.length > 0 ? configured : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "erro desconhecido";
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

function buildPhoneLinkVerificationMessage(input: { confirmUrl: string }) {
  return [
    "Recebemos uma solicitação para vincular este WhatsApp à sua conta no OftAgenda.",
    "",
    "Para confirmar a vinculação, toque no link abaixo:",
    input.confirmUrl,
    "",
    "Se você não fez esta solicitação, ignore esta mensagem.",
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

  const baseUrl = getOftchatbotApiBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      status: 503,
      chatId,
      error:
        "Integração de notificações WhatsApp não configurada (OFTCHATBOT_API_BASE_URL).",
    };
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL("/api/chat/send-text", baseUrl);
  } catch (error) {
    return {
      ok: false,
      status: 500,
      chatId,
      error: `OFTCHATBOT_API_BASE_URL inválida: ${getErrorMessage(error)}`,
    };
  }

  return sendTextViaOftchatbot({
    chatId,
    text: buildAppointmentConfirmationMessage(input),
    apiUrl,
  });
}

export async function sendPhoneLinkVerificationMessage(input: {
  phone: string;
  confirmUrl: string;
}): Promise<NotificationDeliveryResult> {
  const chatId = normalizeChatIdFromPhone(input.phone);
  if (!chatId) {
    return {
      ok: false,
      status: 400,
      error: "Telefone inválido para envio de verificação no WhatsApp.",
    };
  }

  const baseUrl = getOftchatbotApiBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      status: 503,
      chatId,
      error:
        "Integração de notificações WhatsApp não configurada (OFTCHATBOT_API_BASE_URL).",
    };
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL("/api/chat/send-text", baseUrl);
  } catch (error) {
    return {
      ok: false,
      status: 500,
      chatId,
      error: `OFTCHATBOT_API_BASE_URL inválida: ${getErrorMessage(error)}`,
    };
  }

  return sendTextViaOftchatbot({
    chatId,
    text: buildPhoneLinkVerificationMessage({ confirmUrl: input.confirmUrl }),
    apiUrl,
  });
}

async function sendTextViaOftchatbot(input: {
  chatId: string;
  text: string;
  apiUrl: URL;
}): Promise<NotificationDeliveryResult> {
  let response: Response;
  try {
    response = await fetch(input.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId: input.chatId,
        text: input.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    return {
      ok: false,
      status: 503,
      chatId: input.chatId,
      error: `Falha de rede ao enviar mensagem via oftchatbot (${input.apiUrl.origin}): ${getErrorMessage(error)}`,
    };
  }

  const rawBody = await response.text();
  const responseBody = parseUnknownBody(rawBody);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      chatId: input.chatId,
      error: `Falha ao enviar mensagem via oftchatbot (status ${response.status}).`,
      responseBody,
    };
  }

  return {
    ok: true,
    status: response.status,
    chatId: input.chatId,
    responseBody,
  };
}
