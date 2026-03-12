import { NextResponse } from "next/server";

import { api } from "@convex/_generated/api";
import { requireMemberApiAccess } from "@/lib/access";
import { getConvexHttpClient } from "@/lib/convex-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const userId = await requireMemberApiAccess();

    const client = getConvexHttpClient();
    const link = await client.query(api.phoneLinks.getPhoneLinkByClerkUser, {
      clerkUserId: userId,
    });

    if (!link) {
      return NextResponse.json({ ok: true, linked: false });
    }

    const maskedPhone = maskPhone(link.phone);
    return NextResponse.json({
      ok: true,
      linked: true,
      phone: maskedPhone,
      verifiedAt: link.verifiedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao consultar vinculação.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function maskPhone(phone: string) {
  if (phone.length <= 4) return "****";
  return `${"*".repeat(phone.length - 4)}${phone.slice(-4)}`;
}
