import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getCurrentPatient = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("patients")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();
  },
});

export const upsertCurrentPatientBirthDate = mutation({
  args: {
    birthDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const normalizedBirthDate = args.birthDate?.trim();
    if (normalizedBirthDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirthDate)) {
        throw new Error("Data de nascimento inválida.");
      }
      const parsedBirthDate = new Date(`${normalizedBirthDate}T12:00:00`);
      if (Number.isNaN(parsedBirthDate.getTime())) {
        throw new Error("Data de nascimento inválida.");
      }
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (parsedBirthDate.getTime() > today.getTime()) {
        throw new Error("Data de nascimento não pode ser futura.");
      }
    }

    const existingPatient = await ctx.db
      .query("patients")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    const now = Date.now();
    if (existingPatient) {
      await ctx.db.patch(existingPatient._id, {
        birthDate: normalizedBirthDate || undefined,
        updatedAt: now,
      });
      return { ok: true, birthDate: normalizedBirthDate || null };
    }

    await ctx.db.insert("patients", {
      clerkUserId: identity.subject,
      name: (identity.name?.trim() || "Paciente").slice(0, 120),
      phone: "",
      email: typeof identity.email === "string" ? identity.email : "",
      birthDate: normalizedBirthDate || undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { ok: true, birthDate: normalizedBirthDate || null };
  },
});
