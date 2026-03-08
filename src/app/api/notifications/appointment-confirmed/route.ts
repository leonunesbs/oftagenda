import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { sendAppointmentConfirmedNotification } from "@/lib/notifications";

const payloadSchema = z.object({
  appointmentId: z.string().min(1),
  patientName: z.string().min(1),
  patientPhone: z.string().min(8),
  location: z.string().min(1),
  scheduledFor: z.number().int().positive(),
  timezone: z.string().min(3),
  consultationType: z.string().min(1),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload de notificacao invalido.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const delivered = await sendAppointmentConfirmedNotification(parsed.data);
  if (!delivered.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: delivered.error,
        delivery: delivered,
      },
      { status: delivered.status >= 400 ? delivered.status : 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    delivery: delivered,
  });
}
