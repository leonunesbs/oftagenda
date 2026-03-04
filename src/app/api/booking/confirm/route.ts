import { NextResponse } from "next/server";

import { api } from "@convex/_generated/api";
import { bookingSchema } from "@/domain/booking/schema";
import { setBookingConfirmedCookie } from "@/domain/booking/state";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";
import { requireMemberApiAccess } from "@/lib/access";

export async function POST(request: Request) {
  try {
    await requireMemberApiAccess();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha de autorização para confirmar agendamento.";
    const status = message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload de agendamento inválido.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const { client } = await getAuthenticatedConvexHttpClient();
    await client.mutation(api.appointments.confirmBooking, parsed.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao confirmar no backend.";
    const status = message.toLowerCase().includes("not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const response = NextResponse.json({
    ok: true,
    bookingConfirmed: true,
      todo: "Integrar Cal.com para slots reais e confirmação automática.",
  });

  setBookingConfirmedCookie(response.cookies);
  return response;
}
