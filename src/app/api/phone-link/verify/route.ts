import { NextResponse } from "next/server";

import { requireMemberApiAccess } from "@/lib/access";
import { getConvexHttpClient } from "@/lib/convex-server";
import { api } from "@convex/_generated/api";

export const runtime = "nodejs";

export async function DELETE() {
  try {
    const userId = await requireMemberApiAccess();

    const client = getConvexHttpClient();
    const linkedPhone = await client.query(api.phoneLinks.getPhoneLinkByClerkUser, {
      clerkUserId: userId,
    });
    if (!linkedPhone?.phone) {
      return NextResponse.json(
        { ok: false, error: "Nenhuma vinculação encontrada para este usuário." },
        { status: 404 },
      );
    }

    await client.mutation(api.phoneLinks.revokePhoneLink, {
      phone: linkedPhone.phone,
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
