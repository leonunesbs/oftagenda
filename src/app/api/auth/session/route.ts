import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/access";

export async function GET() {
  if (!isClerkConfigured()) {
    return NextResponse.json({
      clerkEnabled: false,
      isAuthenticated: false,
      avatarUrl: null,
      firstName: null,
    });
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        clerkEnabled: true,
        isAuthenticated: false,
        avatarUrl: null,
        firstName: null,
      });
    }

    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    return NextResponse.json({
      clerkEnabled: true,
      isAuthenticated: true,
      avatarUrl: user.imageUrl ?? null,
      firstName: user.firstName ?? null,
    });
  } catch {
    // Keep the session probe resilient. Header UI should degrade gracefully
    // when Clerk is temporarily unavailable instead of bubbling a 500.
    return NextResponse.json({
      clerkEnabled: true,
      isAuthenticated: false,
      avatarUrl: null,
      firstName: null,
    });
  }
}
