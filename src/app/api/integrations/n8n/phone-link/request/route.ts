import crypto from "node:crypto";

import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { resolveSiteUrl } from "@/config/site";
import { getConvexHttpClient } from "@/lib/convex-server";
import { n8nPhoneLinkRequestSchema } from "@/lib/integrations/n8n-schemas";
import { sendPhoneLinkVerificationMessage } from "@/lib/notifications/oftchatbot";
import { api } from "@convex/_generated/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = n8nPhoneLinkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload inválido para solicitar vinculação.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const token = crypto.randomBytes(32).toString("hex");
    const client = getConvexHttpClient();
    const clerkUserId = await findClerkUserIdByEmail(parsed.data.email);
    const result = await client.mutation(api.phoneLinks.createPhoneLinkToken, {
      phone: parsed.data.phone,
      email: parsed.data.email,
      token,
      clerkUserId: clerkUserId ?? undefined,
    });

    const siteUrl = resolveSiteUrl();
    const confirmUrl = new URL("/verificar-whatsapp", siteUrl);
    confirmUrl.searchParams.set("token", result.token);

    const delivery = await sendPhoneLinkVerificationMessage({
      phone: parsed.data.phone,
      confirmUrl: confirmUrl.toString(),
    });
    if (!delivery.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            delivery.error ??
            "Não foi possível enviar a verificação por WhatsApp.",
        },
        { status: delivery.status || 502 },
      );
    }

    return NextResponse.json({ ok: true, messageSent: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao solicitar vinculação.";
    const status = /inválid|encontrad|limite/i.test(message) ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

async function findClerkUserIdByEmail(email: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return null;
    }

    const clerk = await clerkClient();
    const users = await clerk.users.getUserList({
      emailAddress: [normalizedEmail],
      limit: 1,
    });

    return users.data[0]?.id ?? null;
  } catch {
    return null;
  }
}
