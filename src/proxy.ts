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
const siteUnderConstruction =
  process.env.NEXT_PUBLIC_SITE_UNDER_CONSTRUCTION === "true";
const underConstructionPath = "/em-construcao";

function getUnderConstructionRedirect(req: Request) {
  const redirectUrl = new URL(req.url);
  redirectUrl.pathname = underConstructionPath;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

const proxy = clerkConfigured
  ? clerkMiddleware(async (auth, req) => {
      const pathname = req.nextUrl.pathname;
      const isUnderConstructionPage = pathname === underConstructionPath;
      if (
        siteUnderConstruction &&
        !pathname.startsWith("/api/") &&
        !isUnderConstructionPage
      ) {
        return getUnderConstructionRedirect(req);
      }
      if (
        pathname === "/api/stripe/webhook" ||
        pathname.startsWith("/api/integrations/n8n/")
      ) {
        return;
      }
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : (req: Request) => {
      const pathname = new URL(req.url).pathname;
      const isUnderConstructionPage = pathname === underConstructionPath;
      if (
        siteUnderConstruction &&
        !pathname.startsWith("/api/") &&
        !isUnderConstructionPage
      ) {
        return getUnderConstructionRedirect(req);
      }
      return NextResponse.next();
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
