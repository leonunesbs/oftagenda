import {
  BOOKING_CONFIRMED_COOKIE,
  isBookingConfirmedValue,
} from "@/domain/booking/state";
import { auth, clerkClient } from "@clerk/nextjs/server";

import { ConvexHttpClient } from "convex/browser";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "../../convex/_generated/api";

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

export type UserRole = "member" | "admin";
const ROLE_LEVEL: Record<UserRole, number> = {
  member: 1,
  admin: 2,
};

function normalizeUserRole(value: unknown): UserRole | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "admin") {
    return "admin";
  }
  if (normalized === "member") {
    return "member";
  }
  return null;
}

function readRoleFromMetadata(metadata: unknown): UserRole | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  return normalizeUserRole((metadata as Record<string, unknown>).role);
}

async function ensureDefaultRoleMetadata(userId: string) {
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId);

  if (readRoleFromMetadata(user.publicMetadata)) {
    return;
  }

  const publicMetadata =
    user.publicMetadata && typeof user.publicMetadata === "object"
      ? (user.publicMetadata as Record<string, unknown>)
      : {};
  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...publicMetadata,
      role: "member",
    },
  });
}

export async function getUserRoleFromClerkAuth(authData: {
  userId: string | null;
}) {
  if (!authData.userId) {
    return null;
  }
  const clerk = await clerkClient();
  const user = await clerk.users.getUser(authData.userId);
  return readRoleFromMetadata(user.publicMetadata);
}

export function getUserRoleFromSessionClaims(authData: {
  sessionClaims?: Record<string, unknown> | null;
}) {
  const claims = authData.sessionClaims;
  if (!claims || typeof claims !== "object") {
    return null;
  }

  const claimMetadataCandidates = [
    claims.public_metadata,
    claims.publicMetadata,
    claims.metadata,
  ];

  for (const metadata of claimMetadataCandidates) {
    const role = readRoleFromMetadata(metadata);
    if (role) {
      return role;
    }
  }

  return null;
}

function canAccessRole(role: UserRole | null, requiredRole: UserRole) {
  if (!role) {
    return false;
  }
  return ROLE_LEVEL[role] >= ROLE_LEVEL[requiredRole];
}

function buildSignInRedirectUrl(returnBackUrl: string) {
  const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL?.trim() || "/sign-in";
  const separator = signInUrl.includes("?") ? "&" : "?";
  return `${signInUrl}${separator}redirect_url=${encodeURIComponent(returnBackUrl)}`;
}

export async function isAdminFromClerkAuth(authData: {
  userId: string | null;
}) {
  const role = await getUserRoleFromClerkAuth(authData);
  return canAccessRole(role, "admin");
}

export async function requireAuthenticated(returnBackUrl: string) {
  if (!isClerkConfigured()) {
    redirect("/sign-in");
  }

  const { userId } = await auth();
  if (!userId) {
    redirect(buildSignInRedirectUrl(returnBackUrl));
  }

  await ensureDefaultRoleMetadata(userId);
  return userId;
}

export async function requireAdmin(returnBackUrl: string) {
  const authData = await auth();
  const userId = authData.userId;

  if (!userId) {
    redirect(buildSignInRedirectUrl(returnBackUrl));
  }

  await ensureDefaultRoleMetadata(userId);
  const role = await getUserRoleFromClerkAuth(authData);
  if (!canAccessRole(role, "admin")) {
    redirect("/dashboard");
  }

  return userId;
}

export async function requireMember(returnBackUrl: string) {
  const authData = await auth();
  const userId = authData.userId;

  if (!userId) {
    redirect(buildSignInRedirectUrl(returnBackUrl));
  }

  await ensureDefaultRoleMetadata(userId);
  const role = await getUserRoleFromClerkAuth(authData);
  if (!canAccessRole(role, "member")) {
    redirect("/");
  }

  return userId;
}

export async function requireMemberApiAccess() {
  const authData = await auth();
  const userId = authData.userId;
  if (!userId) {
    throw new Error("Not authenticated");
  }

  await ensureDefaultRoleMetadata(userId);
  const role = await getUserRoleFromClerkAuth(authData);
  if (!canAccessRole(role, "member")) {
    throw new Error("Not authorized");
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
  return isBookingConfirmedValue(
    cookieStore.get(BOOKING_CONFIRMED_COOKIE)?.value,
  );
}

export async function requireConfirmedBooking(redirectTo = "/agendar") {
  if (!(await hasConfirmedBooking())) {
    redirect(redirectTo);
  }
}
