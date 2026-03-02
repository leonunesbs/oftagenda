import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { api } from "../../convex/_generated/api";
import { BOOKING_CONFIRMED_COOKIE, isBookingConfirmedValue } from "@/domain/booking/state";

export function isClerkConfigured() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    return false;
  }

  if (
    publishableKey.includes("YOUR_PUBLISHABLE_KEY") ||
    publishableKey.includes("replace_me") ||
    secretKey.includes("YOUR_SECRET_KEY") ||
    secretKey.includes("replace_me")
  ) {
    return false;
  }

  return publishableKey.startsWith("pk_") && secretKey.startsWith("sk_");
}

const ADMIN_PERMISSION = "org:admin:oftagenda";
const ADMIN_ROLES = new Set(["admin", "org:admin"]);

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function readClaim(claims: Record<string, unknown>, path: string[]) {
  let current: unknown = claims;
  for (const key of path) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function isAdminFromClaims(claims: unknown) {
  if (!claims || typeof claims !== "object") {
    return false;
  }

  const map = claims as Record<string, unknown>;
  const roleCandidates = [
    readClaim(map, ["org_role"]),
    readClaim(map, ["role"]),
    readClaim(map, ["metadata", "role"]),
    readClaim(map, ["public_metadata", "role"]),
    readClaim(map, ["private_metadata", "role"]),
  ];

  if (roleCandidates.some((value) => typeof value === "string" && ADMIN_ROLES.has(value))) {
    return true;
  }

  const permissions = [
    ...toStringArray(readClaim(map, ["org_permissions"])),
    ...toStringArray(readClaim(map, ["permissions"])),
    ...toStringArray(readClaim(map, ["metadata", "permissions"])),
    ...toStringArray(readClaim(map, ["public_metadata", "permissions"])),
    ...toStringArray(readClaim(map, ["private_metadata", "permissions"])),
  ];

  return permissions.includes(ADMIN_PERMISSION);
}

export function isAdminFromClerkAuth(authData: { userId: string | null; sessionClaims?: unknown }) {
  if (!authData.userId) {
    return false;
  }
  return isAdminFromClaims(authData.sessionClaims);
}

export async function requireAuthenticated(returnBackUrl: string) {
  if (!isClerkConfigured()) {
    redirect("/sign-in");
  }

  const { userId, redirectToSignIn } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl });
  }

  return userId;
}

export async function requireAdmin(returnBackUrl: string) {
  const authData = await auth();
  const userId = authData.userId;

  if (!userId) {
    return authData.redirectToSignIn({ returnBackUrl });
  }

  if (!isAdminFromClerkAuth(authData)) {
    redirect("/dashboard");
  }

  return userId;
}

export async function hasConfirmedBooking() {
  if (isClerkConfigured() && process.env.NEXT_PUBLIC_CONVEX_URL) {
    const { userId, getToken } = await auth();
    if (userId) {
      let token: string | null = null;
      try {
        token = await getToken({ template: "convex" });
      } catch {
        // If the Clerk JWT template is not configured yet, use cookie fallback below.
      }
      if (token) {
        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
        client.setAuth(token);
        try {
          return await client.query(api.appointments.hasConfirmedBooking, {});
        } catch {
          // Fall back to cookie while Convex setup is still stabilizing.
        }
      }
    }
  }

  const cookieStore = await cookies();
  return isBookingConfirmedValue(cookieStore.get(BOOKING_CONFIRMED_COOKIE)?.value);
}

export async function requireConfirmedBooking(redirectTo = "/agendar") {
  if (!(await hasConfirmedBooking())) {
    redirect(redirectTo);
  }
}
