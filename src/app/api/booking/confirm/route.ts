import { NextResponse } from "next/server";

import { api } from "@convex/_generated/api";
import { bookingCheckoutSchema } from "@/domain/booking/schema";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";
import { requireMemberApiAccess } from "@/lib/access";
import { sendAppointmentConfirmedNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const ACTIVE_APPOINTMENT_ERROR =
  "Você já possui um agendamento ativo. Para remarcar ou gerenciar sua consulta, acesse seu painel.";
const PENDING_RESERVATION_ERROR =
  "Você já possui um agendamento aguardando remarcação. Finalize ou cancele o pendente atual.";

export async function POST(request: Request) {
  try {
    await requireMemberApiAccess();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha de autorização.";
    const status = message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingCheckoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload de confirmação inválido.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const { client } = await getAuthenticatedConvexHttpClient();
    const result = await client.mutation(api.stripe.confirmInPersonBooking, {
      location: parsed.data.location,
      date: parsed.data.date,
      time: parsed.data.time,
    });

    if (result.notification?.type === "appointment_confirmed") {
      const delivery = await sendAppointmentConfirmedNotification(
        result.notification,
      );
      if (!delivery.ok) {
        console.error(
          "[booking.confirm] falha ao enviar notificacao de confirmacao",
          JSON.stringify({
            appointmentId: result.notification.appointmentId,
            status: delivery.status,
            error: delivery.error,
          }),
        );
      }
    }

    return NextResponse.json({
      ok: true,
      redirectTo: "/dashboard?booking=confirmed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao confirmar agendamento.";
    if (message === ACTIVE_APPOINTMENT_ERROR) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "ACTIVE_APPOINTMENT_EXISTS",
          error: "Você já possui um agendamento ativo.",
          errorDetails: "Abra seu painel para remarcar ou gerenciar sua consulta sem criar um novo agendamento.",
          redirectTo: "/dashboard",
        },
        { status: 409 },
      );
    }
    if (message === PENDING_RESERVATION_ERROR) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "PENDING_RESERVATION_EXISTS",
          error: "Você já possui um agendamento pendente.",
          errorDetails: "Finalize ou cancele o agendamento pendente antes de criar outro.",
          redirectTo: "/dashboard#agendamentos-pendentes",
        },
        { status: 409 },
      );
    }
    const status = message.toLowerCase().includes("not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
