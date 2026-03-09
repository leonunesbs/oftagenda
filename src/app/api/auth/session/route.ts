import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/access";

export async function GET() {
  if (!isClerkConfigured()) {
    return NextResponse.json({
      clerkEnabled: false,
      isAuthenticated: false,
      userId: null,
      avatarUrl: null,
      firstName: null,
    });
  }

  try {
    const { getToken, sessionClaims } = await auth();
    const token = await getToken();

    if (!token) {
      return NextResponse.json({
        clerkEnabled: true,
        isAuthenticated: false,
        userId: null,
        avatarUrl: null,
        firstName: null,
      });
    }

    const claims =
      sessionClaims && typeof sessionClaims === "object"
        ? (sessionClaims as Record<string, unknown>)
        : {};
    const userId = typeof claims.sub === "string" ? claims.sub : null;
    const firstName =
      typeof claims.given_name === "string"
        ? claims.given_name
        : typeof claims.first_name === "string"
          ? claims.first_name
          : null;

    return NextResponse.json({
      clerkEnabled: true,
      isAuthenticated: true,
      userId,
      // Avatar and names are not guaranteed in Clerk session token claims.
      avatarUrl: null,
      firstName,
    });
  } catch {
    // Keep the session probe resilient. Header UI should degrade gracefully
    // when Clerk is temporarily unavailable instead of bubbling a 500.
    return NextResponse.json({
      clerkEnabled: true,
      isAuthenticated: false,
      userId: null,
      avatarUrl: null,
      firstName: null,
    });
  }
}
