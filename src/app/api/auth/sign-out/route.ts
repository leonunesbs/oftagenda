import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/access";

export async function POST() {
  if (!isClerkConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store");

  // Ensure browser-side auth cookies are cleared immediately after sign-out.
  response.cookies.set("__session", "", {
    expires: new Date(0),
    path: "/",
  });
  response.cookies.set("__client_uat", "", {
    expires: new Date(0),
    path: "/",
  });

  try {
    const { sessionId } = await auth();
    if (!sessionId) {
      return response;
    }

    const clerk = await clerkClient();
    await clerk.sessions.revokeSession(sessionId);

    return response;
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
