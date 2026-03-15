import {
  clerkMiddleware,
} from "@clerk/nextjs/server";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";

import { isClerkConfigured } from "@/lib/access";

const clerkConfigured = isClerkConfigured();
const siteUnderConstruction =
  process.env.NEXT_PUBLIC_SITE_UNDER_CONSTRUCTION === "true";
const underConstructionPath = "/em-construcao";

function getUnderConstructionRedirect(req: Request) {
  const redirectUrl = new URL(req.url);
  redirectUrl.pathname = underConstructionPath;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL?.trim() || "/sign-in";

function isPublicApiBypass(pathname: string) {
  return (
    pathname === "/api/stripe/webhook" ||
    pathname === "/api/stripe/webhook/" ||
    pathname === "/api/booking/options" ||
    pathname === "/api/booking/options/" ||
    pathname.startsWith("/api/integrations/n8n/")
  );
}

function isRoutePrefetch(req: NextRequest) {
  return (
    req.headers.has("next-router-prefetch") ||
    req.headers.get("purpose") === "prefetch" ||
    req.headers.get("sec-purpose") === "prefetch"
  );
}

function shouldRunClerk(_pathname: string) {
  // Keep Clerk middleware active on all matched routes so server-side `auth()`
  // can resolve the current session even on public pages like `/`.
  return true;
}

const clerkProxy = clerkMiddleware(
  async (auth, req: NextRequest) => {
    const pathname = req.nextUrl.pathname;
    const requiresAuth =
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/verificar-whatsapp") ||
      (pathname.startsWith("/api/") && !isPublicApiBypass(pathname));

    if (requiresAuth) {
      const authData = await auth();
      if (authData.userId) {
        return NextResponse.next();
      }

      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }

      if (isRoutePrefetch(req)) {
        return NextResponse.next();
      }

      const redirectUrl = new URL(signInUrl, req.url);
      redirectUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(redirectUrl);
    }
  },
);

const proxy = (req: NextRequest, event: NextFetchEvent) => {
  const pathname = req.nextUrl.pathname;

  const isUnderConstructionPage = pathname === underConstructionPath;

  if (
    siteUnderConstruction &&
    !pathname.startsWith("/api/") &&
    !isUnderConstructionPage
  ) {
    return getUnderConstructionRedirect(req);
  }

  if (!clerkConfigured) {
    return NextResponse.next();
  }

  if (isPublicApiBypass(pathname) || !shouldRunClerk(pathname)) {
    return NextResponse.next();
  }

  return clerkProxy(req, event);
};

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
