import { NextResponse } from "next/server";

import { n8nResumoLinkSchema } from "@/lib/integrations/n8n-schemas";

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
  if (parsed.data.utmSource) {
    params.set("utm_source", parsed.data.utmSource);
  }
  if (parsed.data.utmMedium) {
    params.set("utm_medium", parsed.data.utmMedium);
  }
  if (parsed.data.utmCampaign) {
    params.set("utm_campaign", parsed.data.utmCampaign);
  }
  if (parsed.data.utmContent) {
    params.set("utm_content", parsed.data.utmContent);
  }
  if (parsed.data.utmTerm) {
    params.set("utm_term", parsed.data.utmTerm);
  }
  if (parsed.data.gclid) {
    params.set("gclid", parsed.data.gclid);
  }
  if (parsed.data.gbraid) {
    params.set("gbraid", parsed.data.gbraid);
  }
  if (parsed.data.wbraid) {
    params.set("wbraid", parsed.data.wbraid);
  }
  if (parsed.data.fbclid) {
    params.set("fbclid", parsed.data.fbclid);
  }
  if (parsed.data.msclkid) {
    params.set("msclkid", parsed.data.msclkid);
  }

  if (parsed.data.phone) {
    params.set("phone", parsed.data.phone);
  }

  const summaryPath = buildSummaryPath(params);
  const summaryUrl = `${resolveForwardOrigin()}/${summaryPath}`;
  return NextResponse.json({
    ok: true,
    summaryPath,
    summaryUrl,
  });
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

function buildSummaryPath(params: URLSearchParams) {
  const query = params.toString();
  if (!query) {
    return "agendar/resumo";
  }
  return `agendar/resumo?${query}`;
}
