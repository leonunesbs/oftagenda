import crypto from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { resolveSiteUrl } from "@/config/site";
import { requireMemberApiAccess } from "@/lib/access";
import {
  getAuthenticatedConvexHttpClient,
  getConvexHttpClient,
} from "@/lib/convex-server";
import { sendPhoneVerificationEmail } from "@/lib/email/resend";
import { api } from "@convex/_generated/api";

export const runtime = "nodejs";

const requestSchema = z.object({
  phone: z.string().trim().min(8).max(30),
});

export async function POST(request: Request) {
  try {
    await requireMemberApiAccess();

    const body = await request.json().catch(() => null);
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Número de WhatsApp inválido.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { client } = await getAuthenticatedConvexHttpClient();
    const patient = await client.query(api.patients.getCurrentPatient, {});
    if (!patient) {
      return NextResponse.json(
        { ok: false, error: "Perfil de paciente não encontrado." },
        { status: 404 },
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const convex = getConvexHttpClient();
    const result = await convex.mutation(api.phoneLinks.createPhoneLinkToken, {
      phone: parsed.data.phone,
      email: patient.email,
      token,
    });

    const siteUrl = resolveSiteUrl();
    const confirmUrl = new URL("/verificar-whatsapp", siteUrl);
    confirmUrl.searchParams.set("token", result.token);

    await sendPhoneVerificationEmail({
      to: patient.email,
      confirmUrl: confirmUrl.toString(),
      phone: parsed.data.phone,
    });

    return NextResponse.json({ ok: true, emailSent: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao solicitar vinculação.";
    const status = /inválid|encontrad|limite/i.test(message) ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
