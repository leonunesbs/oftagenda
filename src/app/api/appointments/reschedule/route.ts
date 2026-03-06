import { NextResponse } from "next/server";

import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { bookingCheckoutSchema } from "@/domain/booking/schema";
import { requireMemberApiAccess } from "@/lib/access";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireMemberApiAccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha de autorização.";
    const status =
      message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload de remarcação inválido.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const { client } = await getAuthenticatedConvexHttpClient();
    const result = await client.mutation(api.appointments.rescheduleOwnAppointment, {
      location: parsed.data.location,
      date: parsed.data.date,
      time: parsed.data.time,
    });

    return NextResponse.json({
      ok: true,
      appointmentId: result.appointmentId as Id<"appointments">,
      scheduledFor: result.scheduledFor,
      location: result.location,
      consultationType: result.consultationType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao remarcar consulta.";
    const status = message.toLowerCase().includes("not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
