import { NextResponse } from "next/server";

import { api } from "@convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-server";
import { requireN8nApiKey } from "@/lib/integrations/n8n-auth";
import { n8nAvailabilitySearchSchema } from "@/lib/integrations/n8n-schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = requireN8nApiKey(request);
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);
  const parsed = n8nAvailabilitySearchSchema.safeParse({
    location: url.searchParams.get("location"),
    daysAhead: url.searchParams.get("daysAhead") ?? "14",
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Parâmetros inválidos para disponibilidade.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const client = getConvexHttpClient();
    const options = await client.query(api.appointments.getBookingOptionsByLocation, {
      location: parsed.data.location,
      daysAhead: parsed.data.daysAhead,
    });
    return NextResponse.json({ ok: true, options });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao buscar datas e horários para integração n8n.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
