import { NextResponse } from "next/server";

import { requireN8nApiKey } from "@/lib/integrations/n8n-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = requireN8nApiKey(request);
  if (authError) {
    return authError;
  }

  const requestOrigin = new URL(request.url).origin;
  const forwardOrigin =
    process.env.N8N_OFTAGENDA_FORWARD_ORIGIN?.trim() || "https://agenda.oftleonardo.com.br";

  return NextResponse.json({
    ok: true,
    integration: "oftagenda-n8n",
    baseUrl: requestOrigin,
    setupChecklist: [
      "Defina a URL base real do seu OftAgenda (evite placeholders).",
      "Envie o header x-api-key em todas as requisicoes.",
      "Use os endpoints abaixo com o prefixo /api/integrations/n8n.",
    ],
    auth: {
      header: "x-api-key",
      alternative: "Authorization: Bearer <N8N_OFTAGENDA_API_KEY>",
    },
    endpoints: [
      {
        method: "GET",
        path: "/api/integrations/n8n/locations",
        description: "Lista locais ativos de atendimento para agendamento.",
      },
      {
        method: "GET",
        path: "/api/integrations/n8n/availability?location=<slug>&daysAhead=14",
        description: "Lista datas e horários disponíveis para o local.",
      },
      {
        method: "GET",
        path: "/api/integrations/n8n/appointments?phone=5599999999999&includeHistory=true",
        description: "Consulta agendamentos por telefone do paciente.",
      },
      {
        method: "PATCH",
        path: "/api/integrations/n8n/appointments",
        description: "Atualiza status de um agendamento por appointmentId + telefone.",
        body: {
          appointmentId: "j57...",
          phone: "5599999999999",
          status: "confirmed | rescheduled | cancelled | completed",
          reason: "opcional",
        },
      },
      {
        method: "POST",
        path: "/api/integrations/n8n/appointments/cancel",
        description: "Atalho para cancelar agendamento por appointmentId + telefone.",
      },
      {
        method: "POST",
        path: "/api/integrations/n8n/resumo-link",
        description: "Gera link para encaminhar paciente à página /agendar/resumo.",
        body: {
          location: "fortaleza",
          date: "2026-03-20",
          time: "14:00",
          waUserId: "5599999999999@c.us",
          payment: "cancelled (opcional)",
          source: "n8n (opcional)",
        },
        responseExample: {
          summaryUrl: `${forwardOrigin}/agendar/resumo?location=fortaleza&date=2026-03-20&time=14%3A00&waUserId=5599999999999%40c.us&source=n8n`,
          valid: true,
        },
      },
    ],
    docsPath: "/docs/n8n-api.md",
  });
}
