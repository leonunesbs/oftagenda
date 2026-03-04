import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/access";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/agendar(.*)",
  "/detalhes(.*)",
  "/api/(.*)",
]);

const clerkConfigured = isClerkConfigured();

const proxy = clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : () => NextResponse.next();

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
