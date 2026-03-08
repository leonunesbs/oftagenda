import { NextResponse } from "next/server";

import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-server";
import { requireN8nApiKey } from "@/lib/integrations/n8n-auth";
import {
  n8nAppointmentLookupSchema,
  n8nUpdateAppointmentStatusSchema,
} from "@/lib/integrations/n8n-schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = requireN8nApiKey(request);
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);
  const parsed = n8nAppointmentLookupSchema.safeParse({
    phone: url.searchParams.get("phone"),
    includeHistory: url.searchParams.get("includeHistory") ?? "false",
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Parâmetros inválidos para consulta de agendamento.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const client = getConvexHttpClient();
    const result = await client.query(api.n8n.getAppointmentsByPhone, parsed.data);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao consultar agendamentos para integração n8n.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authError = requireN8nApiKey(request);
  if (authError) {
    return authError;
  }

  const body = await request.json().catch(() => null);
  const parsed = n8nUpdateAppointmentStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload inválido para atualizar agendamento.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const client = getConvexHttpClient();
    const result = await client.mutation(api.n8n.updateAppointmentStatusByPhone, {
      appointmentId: parsed.data.appointmentId as Id<"appointments">,
      phone: parsed.data.phone,
      status: parsed.data.status,
      reason: parsed.data.reason,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao atualizar status de agendamento via integração n8n.";
    const status = /não encontrado|invalido|inválido|corresponde/i.test(message) ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
