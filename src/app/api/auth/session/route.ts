import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/access";

export async function GET() {
  if (!isClerkConfigured()) {
    return NextResponse.json({
      clerkEnabled: false,
      isAuthenticated: false,
    });
  }

  const { userId } = await auth();
  return NextResponse.json({
    clerkEnabled: true,
    isAuthenticated: Boolean(userId),
  });
}
