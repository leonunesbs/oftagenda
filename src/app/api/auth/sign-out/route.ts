import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/access";

export async function POST() {
  if (!isClerkConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  try {
    const { getToken, sessionId } = await auth();
    const token = await getToken();
    if (!token || !sessionId) {
      return NextResponse.json({ ok: true });
    }

    const clerk = await clerkClient();
    await clerk.sessions.revokeSession(sessionId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
