import { clerkClient } from '@clerk/nextjs/server';
import { api } from '@convex/_generated/api';
import { NextResponse } from 'next/server';
import StripeSdk from 'stripe';

import { bookingCheckoutSchema } from '@/domain/booking/schema';
import { requireMemberApiAccess } from '@/lib/access';
import { getAuthenticatedConvexHttpClient } from '@/lib/convex-server';
import { getStripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';
const CHECKOUT_SESSION_DURATION_SECONDS = 30 * 60;
const ACTIVE_APPOINTMENT_ERROR =
  'Você já possui um agendamento ativo. Para remarcar ou gerenciar sua consulta, acesse seu painel.';
const PENDING_RESERVATION_ERROR =
  'Você já possui um agendamento aguardando remarcação. Finalize ou cancele o pendente atual.';
const checkoutPayloadSchema = bookingCheckoutSchema;

export async function POST(request: Request) {
  try {
    await requireMemberApiAccess();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha de autorização.';
    const status = message === 'Not authenticated' ? 401 : message === 'Not authorized' ? 403 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }

  const body = await request.json().catch(() => null);
  const parsed = checkoutPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Payload de checkout inválido.',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const { client, userId } = await getAuthenticatedConvexHttpClient();
    const draft = await client.mutation(api.stripe.createCheckoutDraft, {
      location: parsed.data.location,
      date: parsed.data.date,
      time: parsed.data.time,
    });
    const customerEmail = await getCustomerEmailByUserId(userId);

    const stripe = getStripeClient();
    const origin = new URL(request.url).origin;
    const cancelParams = new URLSearchParams({
      location: parsed.data.location,
      date: parsed.data.date,
      time: parsed.data.time,
      payment: 'cancelled',
    });

    try {
      const lineItems = draft.stripePriceId
        ? [{ price: draft.stripePriceId, quantity: 1 }]
        : [
            {
              price_data: {
                currency: draft.currency.toLowerCase(),
                unit_amount: draft.amountCents,
                product_data: {
                  name: draft.eventTypeName || 'Consulta oftalmologica',
                },
              },
              quantity: 1,
            },
          ];

      const desiredHoldExpiresAt = draft.holdExpiresAt ?? Date.now() + CHECKOUT_SESSION_DURATION_SECONDS * 1000;
      const successUrl = `${origin}/dashboard?payment=success`;

      const checkoutSessionParams: StripeSdk.Checkout.SessionCreateParams = {
        expires_at: Math.floor(desiredHoldExpiresAt / 1000),
        mode: 'payment',
        line_items: lineItems,
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
        customer_email: customerEmail ?? undefined,
        success_url: successUrl,
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
      };
      const session = await stripe.checkout.sessions.create(checkoutSessionParams);

      await client.mutation(api.stripe.attachCheckoutSession, {
        reservationId: draft.reservationId,
        paymentId: draft.paymentId,
        checkoutSessionId: session.id,
        paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
        amountCents:
          typeof session.amount_total === 'number' && session.amount_total > 0
            ? session.amount_total
            : draft.amountCents,
        holdExpiresAt:
          typeof session.expires_at === 'number' && Number.isFinite(session.expires_at)
            ? session.expires_at * 1000
            : draft.holdExpiresAt,
      });

      if (!session.url) {
        throw new Error('Stripe não retornou URL de checkout.');
      }

      return NextResponse.json({
        ok: true,
        url: session.url,
      });
    } catch (stripeError) {
      await client.mutation(api.stripe.releaseCheckoutDraft, {
        reservationId: draft.reservationId,
        paymentId: draft.paymentId,
        reason:
          stripeError instanceof Error
            ? `Falha ao criar checkout Stripe: ${stripeError.message}`
            : 'Falha ao criar checkout Stripe.',
      });
      throw stripeError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao iniciar checkout Stripe.';
    if (message === ACTIVE_APPOINTMENT_ERROR) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: 'ACTIVE_APPOINTMENT_EXISTS',
          error: 'Você já possui um agendamento ativo.',
          errorDetails: 'Abra seu painel para remarcar ou gerenciar sua consulta sem criar um novo agendamento.',
          redirectTo: '/dashboard',
        },
        { status: 409 },
      );
    }
    if (message === PENDING_RESERVATION_ERROR) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: 'PENDING_RESERVATION_EXISTS',
          error: 'Voce ja possui um agendamento pendente.',
          errorDetails: 'Finalize ou cancele o agendamento pendente antes de criar outro.',
          redirectTo: '/dashboard#agendamentos-pendentes',
        },
        { status: 409 },
      );
    }
    const status = message.toLowerCase().includes('not authenticated') ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

async function getCustomerEmailByUserId(userId: string) {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const primaryEmailId = user.primaryEmailAddressId;
    if (primaryEmailId) {
      const primaryEmail = user.emailAddresses.find((item) => item.id === primaryEmailId);
      if (primaryEmail?.emailAddress) {
        return primaryEmail.emailAddress;
      }
    }
    return user.emailAddresses[0]?.emailAddress ?? null;
  } catch {
    return null;
  }
}
