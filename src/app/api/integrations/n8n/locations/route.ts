import { NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-server";

export const runtime = "nodejs";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatCurrency(cents?: number) {
  const safeCents =
    typeof cents === "number" && Number.isFinite(cents) && cents > 0 ? cents : 0;
  return currencyFormatter.format(safeCents / 100);
}

export async function GET() {
  try {
    const client = getConvexHttpClient();
    const rawLocations = await client.query(
      api.appointments.getActiveBookingLocations,
      {},
    );
    const locations = rawLocations.map((location) => ({
      ...location,
      consultationPriceFormatted: formatCurrency(location.consultationPriceCents),
      reservationFeeFormatted: formatCurrency(location.reservationFeeCents),
      paymentGuidance:
        location.paymentMode === "full_payment"
          ? "Valor referente ao pagamento integral da consulta."
          : location.paymentMode === "in_person"
            ? "Pagamento realizado presencialmente no dia da consulta."
            : `Taxa de reserva de ${location.reservationFeePercent}% para garantir o horário.`,
    }));
    return NextResponse.json({ ok: true, locations });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao listar locais para integração n8n.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
