import { NextResponse } from "next/server";

import { api } from "@convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET() {
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
