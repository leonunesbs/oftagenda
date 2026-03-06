import { v } from "convex/values";

import { mutation } from "./_generated/server";

export const submitDetails = mutation({
  args: {
    encryptedPayload: v.object({
      version: v.literal("v1"),
      algorithm: v.literal("RSA-OAEP/AES-GCM-256"),
      keyVersion: v.string(),
      wrappedKeyB64: v.string(),
      ivB64: v.string(),
      ciphertextB64: v.string(),
    }),
    score: v.number(),
    level: v.union(v.literal("ALTA"), v.literal("POSSIVEL"), v.literal("BAIXA")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();

    const activeAppointment = [...appointments]
      .sort((a, b) => b.requestedAt - a.requestedAt)
      .find((item) => item.status === "confirmed" || item.status === "rescheduled");

    if (!activeAppointment) {
      throw new Error("No confirmed appointment found");
    }

    const now = Date.now();

    const existing = await ctx.db
      .query("appointment_details")
      .withIndex("by_appointment_id", (q) => q.eq("appointmentId", activeAppointment._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        triageCiphertext: args.encryptedPayload.ciphertextB64,
        triageWrappedKey: args.encryptedPayload.wrappedKeyB64,
        triageIv: args.encryptedPayload.ivB64,
        encryptionVersion: args.encryptedPayload.version,
        encryptionAlgorithm: args.encryptedPayload.algorithm,
        encryptionKeyVersion: args.encryptedPayload.keyVersion,
        dilatationLevel: args.level,
        dilatationScore: args.score,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("appointment_details", {
        appointmentId: activeAppointment._id,
        clerkUserId,
        triageCiphertext: args.encryptedPayload.ciphertextB64,
        triageWrappedKey: args.encryptedPayload.wrappedKeyB64,
        triageIv: args.encryptedPayload.ivB64,
        encryptionVersion: args.encryptedPayload.version,
        encryptionAlgorithm: args.encryptedPayload.algorithm,
        encryptionKeyVersion: args.encryptedPayload.keyVersion,
        dilatationLevel: args.level,
        dilatationScore: args.score,
        submittedAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("appointment_events", {
      appointmentId: activeAppointment._id,
      clerkUserId,
      eventType: "details_submitted",
      notes: "Triagem opcional enviada pelo paciente.",
      createdAt: now,
    });

    return {
      appointmentId: activeAppointment._id,
      score: args.score,
      level: args.level,
      advisory: "A decisao final sobre dilatacao e sempre feita no consultorio.",
    };
  },
});
