import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const userRoleValidator = v.union(v.literal("member"), v.literal("admin"));
type UserRole = "member" | "admin";

function normalizeRole(value: unknown): UserRole | null {
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

function readRoleFromLegacyClaims(identity: Record<string, unknown>) {
  const roleCandidates = [
    readClaim(identity, ["publicMetadata", "role"]),
    readClaim(identity, ["public_metadata", "role"]),
    readClaim(identity, ["metadata", "role"]),
  ];

  for (const candidate of roleCandidates) {
    const role = normalizeRole(candidate);
    if (role) {
      return role;
    }
  }

  return null;
}

export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const row = await ctx.db
      .query("user_roles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    return row?.role ?? null;
  },
});

export const ensureCurrentUserRole = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("user_roles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (existing) {
      return { role: existing.role, migratedFromLegacyClaims: false };
    }

    const inferredRole =
      readRoleFromLegacyClaims(identity as unknown as Record<string, unknown>) ?? "member";
    const now = Date.now();
    await ctx.db.insert("user_roles", {
      clerkUserId: identity.subject,
      role: inferredRole,
      createdAt: now,
      updatedAt: now,
    });

    return {
      role: inferredRole,
      migratedFromLegacyClaims: inferredRole !== "member",
    };
  },
});

export const setRole = mutation({
  args: {
    clerkUserId: v.string(),
    role: userRoleValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const actor = await ctx.db
      .query("user_roles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
    if (!actor || actor.role !== "admin") {
      throw new Error("Not authorized");
    }

    const targetClerkUserId = args.clerkUserId.trim();
    if (!targetClerkUserId) {
      throw new Error("clerkUserId is required");
    }

    const now = Date.now();
    const existingTarget = await ctx.db
      .query("user_roles")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", targetClerkUserId))
      .first();

    if (existingTarget) {
      await ctx.db.patch(existingTarget._id, {
        role: args.role,
        updatedAt: now,
      });
      return { ok: true, updated: true };
    }

    await ctx.db.insert("user_roles", {
      clerkUserId: targetClerkUserId,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, updated: false };
  },
});
