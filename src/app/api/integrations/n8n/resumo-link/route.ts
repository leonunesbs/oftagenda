import { NextResponse } from "next/server";

import { n8nResumoLinkSchema } from "@/lib/integrations/n8n-schemas";
import { resolvePreBookingSummary } from "@/lib/pre-booking-summary";

export const runtime = "nodejs";
const DEFAULT_FORWARD_ORIGIN = "https://agenda.oftleonardo.com.br";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = n8nResumoLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload inválido para gerar link de resumo.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    location: parsed.data.location,
    date: parsed.data.date,
    time: parsed.data.time,
  });
  if (parsed.data.payment) {
    params.set("payment", parsed.data.payment);
  }
  if (parsed.data.source) {
    params.set("source", parsed.data.source);
  }
  if (parsed.data.waUserId) {
    params.set("waUserId", parsed.data.waUserId);
  }

  const summaryUrl = `${resolveForwardOrigin()}/agendar/resumo?${params.toString()}`;

  try {
    const summary = await resolvePreBookingSummary({
      location: parsed.data.location,
      date: parsed.data.date,
      time: parsed.data.time,
      payment: parsed.data.payment,
    });

    return NextResponse.json({
      ok: true,
      summaryUrl,
      valid: !summary.hasInvalidSelection && !summary.hasRedactedParams && !summary.hasMissingParams,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao validar seleção para link de resumo.";
    return NextResponse.json(
      {
        ok: true,
        summaryUrl,
        valid: false,
        warning: message,
      },
      { status: 200 },
    );
  }
}

function resolveForwardOrigin() {
  const configured = process.env.N8N_OFTAGENDA_FORWARD_ORIGIN?.trim();
  if (!configured) {
    return DEFAULT_FORWARD_ORIGIN;
  }
  try {
    return new URL(configured).origin;
  } catch {
    return DEFAULT_FORWARD_ORIGIN;
  }
}
