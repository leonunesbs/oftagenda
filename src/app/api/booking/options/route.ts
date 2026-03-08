import { NextResponse } from "next/server";

import { api } from "@convex/_generated/api";
import { bookingLocationSchema } from "@/domain/booking/schema";
import { getConvexHttpClient } from "@/lib/convex-server";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const locationParam = url.searchParams.get("location");
    const daysAheadParam = Number(url.searchParams.get("daysAhead") ?? "3650");
    const targetDateParam = url.searchParams.get("targetDate") ?? undefined;
    const parsedLocation = bookingLocationSchema.safeParse(locationParam);

    if (!parsedLocation.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Local inválido.",
        },
        { status: 400 },
      );
    }

    const client = getConvexHttpClient();
    const options = await client.query(api.appointments.getBookingOptionsByLocation, {
      location: parsedLocation.data,
      daysAhead: Number.isNaN(daysAheadParam) ? 3650 : daysAheadParam,
      targetDate: targetDateParam,
    });

    return NextResponse.json({ ok: true, options });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao buscar disponibilidade.";
    const status = message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
