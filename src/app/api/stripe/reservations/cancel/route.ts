import { NextResponse } from "next/server";

import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { requireMemberApiAccess } from "@/lib/access";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireMemberApiAccess();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha de autorização.";
    const status =
      message === "Not authenticated"
        ? 401
        : message === "Not authorized"
          ? 403
          : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const body = await request.json().catch(() => null);
  const reservationId =
    body && typeof body.reservationId === "string"
      ? body.reservationId.trim()
      : "";
  if (!reservationId) {
    return NextResponse.json(
      { ok: false, error: "reservationId é obrigatório." },
      { status: 400 },
    );
  }

  try {
    const { client } = await getAuthenticatedConvexHttpClient();
    const result = await client.mutation(api.stripe.cancelPendingReservation, {
      reservationId: reservationId as Id<"reservations">,
    });
    return NextResponse.json({
      ok: true,
      alreadyClosed: Boolean(result.alreadyClosed),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao cancelar o agendamento pendente.";
    const status = message.toLowerCase().includes("not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
