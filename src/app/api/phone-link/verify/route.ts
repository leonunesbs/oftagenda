import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { api } from "@convex/_generated/api";
import { requireMemberApiAccess } from "@/lib/access";
import { getConvexHttpClient } from "@/lib/convex-server";

export const runtime = "nodejs";

const revokeSchema = z.object({
  phone: z.string().trim().min(8).max(30),
});

export async function DELETE(request: Request) {
  try {
    const userId = await requireMemberApiAccess();

    const body = await request.json().catch(() => null);
    const parsed = revokeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Telefone inválido.", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const client = getConvexHttpClient();
    await client.mutation(api.phoneLinks.revokePhoneLink, {
      phone: parsed.data.phone,
      clerkUserId: userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao desvincular.";
    const status = /inválid|encontrad|pertence/i.test(message) ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
