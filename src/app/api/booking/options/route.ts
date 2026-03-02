import { NextResponse } from "next/server";

import { bookingLocationSchema } from "@/domain/booking/schema";
import { getConvexHttpClient } from "@/lib/convex-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locationParam = url.searchParams.get("location");
  const daysAheadParam = Number(url.searchParams.get("daysAhead") ?? "14");
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

  try {
    const client = getConvexHttpClient();
    const options = await client.query(
      "appointments:getBookingOptionsByLocation" as never,
      {
        location: parsedLocation.data,
        daysAhead: Number.isNaN(daysAheadParam) ? 14 : daysAheadParam,
      } as never,
    );

    return NextResponse.json({ ok: true, options });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao buscar disponibilidade.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
