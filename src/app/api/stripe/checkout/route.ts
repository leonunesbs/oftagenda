import { NextResponse } from "next/server";

import { bookingCheckoutSchema } from "@/domain/booking/schema";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";
import { requireMemberApiAccess } from "@/lib/access";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

const createCheckoutDraftRef = {
  _type: "mutation",
  _visibility: "public",
  _functionName: "stripe:createCheckoutDraft",
} as const;

const attachCheckoutSessionRef = {
  _type: "mutation",
  _visibility: "public",
  _functionName: "stripe:attachCheckoutSession",
} as const;

const releaseCheckoutDraftRef = {
  _type: "mutation",
  _visibility: "public",
  _functionName: "stripe:releaseCheckoutDraft",
} as const;

export async function POST(request: Request) {
  try {
    await requireMemberApiAccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha de autorização.";
    const status = message === "Not authenticated" ? 401 : message === "Not authorized" ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const body = await request.json().catch(() => null);
  const parsed = bookingCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload de checkout inválido.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const { client, userId } = await getAuthenticatedConvexHttpClient();
    const draft = await client.mutation(createCheckoutDraftRef as any, parsed.data);

    const stripe = getStripeClient();
    const origin = new URL(request.url).origin;
    const cancelParams = new URLSearchParams({
      location: parsed.data.location,
      date: parsed.data.date,
      time: parsed.data.time,
      payment: "cancelled",
    });

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: draft.stripePriceId, quantity: 1 }],
        payment_intent_data: {
          metadata: {
            reservationId: String(draft.reservationId),
            paymentId: String(draft.paymentId),
            clerkUserId: String(userId),
            eventTypeSlug: draft.eventTypeSlug,
            location: parsed.data.location,
            date: parsed.data.date,
            time: parsed.data.time,
          },
        },
        success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/agendar/resumo?${cancelParams.toString()}`,
        metadata: {
          reservationId: String(draft.reservationId),
          paymentId: String(draft.paymentId),
          clerkUserId: String(userId),
          eventTypeSlug: draft.eventTypeSlug,
          location: parsed.data.location,
          date: parsed.data.date,
          time: parsed.data.time,
        },
      });

      await client.mutation(attachCheckoutSessionRef as any, {
        reservationId: draft.reservationId,
        paymentId: draft.paymentId,
        checkoutSessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      });

      if (!session.url) {
        throw new Error("Stripe não retornou URL de checkout.");
      }

      return NextResponse.json({
        ok: true,
        url: session.url,
      });
    } catch (stripeError) {
      await client.mutation(releaseCheckoutDraftRef as any, {
        reservationId: draft.reservationId,
        paymentId: draft.paymentId,
        reason:
          stripeError instanceof Error
            ? `Falha ao criar checkout Stripe: ${stripeError.message}`
            : "Falha ao criar checkout Stripe.",
      });
      throw stripeError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao iniciar checkout Stripe.";
    const status = message.toLowerCase().includes("not authenticated") ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

