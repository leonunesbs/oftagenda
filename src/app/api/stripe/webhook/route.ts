import { NextResponse } from "next/server";
import Stripe from "stripe";

import { api } from "@convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-server";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";

type ReconcileStatus = "paid" | "failed" | "expired" | "refunded";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "Assinatura Stripe ausente." }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeClient();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assinatura inválida.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const normalized = normalizeStripeEvent(event);
  if (!normalized) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const client = getConvexHttpClient();
    await client.mutation(api.stripe.reconcileStripeEvent, normalized);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao reconciliar webhook.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function normalizeStripeEvent(event: Stripe.Event) {
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.expired" ||
    event.type === "checkout.session.async_payment_succeeded" ||
    event.type === "checkout.session.async_payment_failed"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    if (event.type === "checkout.session.completed" && session.payment_status !== "paid") {
      // For async payment methods, wait for async_payment_succeeded/failed.
      return null;
    }
    const status: ReconcileStatus =
      event.type === "checkout.session.expired"
        ? "expired"
        : event.type === "checkout.session.async_payment_failed"
          ? "failed"
          : "paid";
    return {
      eventId: event.id,
      eventType: event.type,
      status,
      checkoutSessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      customerName: session.customer_details?.name ?? undefined,
      customerEmail: session.customer_details?.email ?? undefined,
      customerPhone: session.customer_details?.phone ?? undefined,
      metadata: {
        reservationId: session.metadata?.reservationId,
        paymentId: session.metadata?.paymentId,
        clerkUserId: session.metadata?.clerkUserId,
        location: session.metadata?.location,
        date: session.metadata?.date,
        time: session.metadata?.time,
      },
    };
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    return {
      eventId: event.id,
      eventType: event.type,
      status: "failed" as const,
      checkoutSessionId: paymentIntent.metadata.checkoutSessionId,
      paymentIntentId: paymentIntent.id,
      metadata: {
        reservationId: paymentIntent.metadata.reservationId,
        paymentId: paymentIntent.metadata.paymentId,
        clerkUserId: paymentIntent.metadata.clerkUserId,
        location: paymentIntent.metadata.location,
        date: paymentIntent.metadata.date,
        time: paymentIntent.metadata.time,
      },
    };
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    return {
      eventId: event.id,
      eventType: event.type,
      status: "refunded" as const,
      checkoutSessionId: charge.metadata.checkoutSessionId,
      paymentIntentId: typeof charge.payment_intent === "string" ? charge.payment_intent : undefined,
      metadata: {
        reservationId: charge.metadata.reservationId,
        paymentId: charge.metadata.paymentId,
        clerkUserId: charge.metadata.clerkUserId,
        location: charge.metadata.location,
        date: charge.metadata.date,
        time: charge.metadata.time,
      },
    };
  }

  return null;
}

