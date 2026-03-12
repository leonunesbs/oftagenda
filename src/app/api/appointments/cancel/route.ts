import { NextResponse } from "next/server";

import { api } from "@convex/_generated/api";
import { requireMemberApiAccess } from "@/lib/access";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function POST() {
  try {
    await requireMemberApiAccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha de autorização.";
    const status =
      message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  try {
    const { client } = await getAuthenticatedConvexHttpClient();
    const result = await client.mutation(api.appointments.cancelOwnAppointment, {});

    return NextResponse.json({
      ok: true,
      appointmentId: result.appointmentId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao cancelar consulta.";
    const status = message.toLowerCase().includes("not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
