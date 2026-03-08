import { NextResponse } from "next/server";

import { api } from "@convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-server";
import { requireN8nApiKey } from "@/lib/integrations/n8n-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authError = requireN8nApiKey(request);
  if (authError) {
    return authError;
  }

  try {
    const client = getConvexHttpClient();
    const locations = await client.query(api.appointments.getActiveBookingLocations, {});
    return NextResponse.json({ ok: true, locations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao listar locais para integração n8n.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
