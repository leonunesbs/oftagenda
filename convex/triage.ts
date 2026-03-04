import { v } from "convex/values";

import { mutation } from "./_generated/server";

const reasonValidator = v.union(
  v.literal("routine"),
  v.literal("glasses"),
  v.literal("blurred"),
  v.literal("pain"),
  v.literal("retina_follow"),
  v.literal("glaucoma_follow"),
  v.literal("postop"),
  v.literal("other"),
);

const conditionValidator = v.union(
  v.literal("diabetes"),
  v.literal("hypertension"),
  v.literal("glaucoma"),
  v.literal("prior_surgery"),
);

const symptomValidator = v.union(
  v.literal("floaters"),
  v.literal("flashes"),
  v.literal("sudden_loss"),
);

const lastDilationValidator = v.union(
  v.literal("lt6m"),
  v.literal("6to12m"),
  v.literal("gt1y"),
  v.literal("unknown"),
);

const reasonScore: Record<string, number> = {
  retina_follow: 2,
  blurred: 2,
  routine: 1,
  pain: 1,
  glaucoma_follow: 1,
  postop: 1,
  glasses: 0,
  other: 0,
};

const conditionScore: Record<string, number> = {
  diabetes: 2,
  prior_surgery: 1,
  glaucoma: 1,
  hypertension: 0,
};

const symptomScore: Record<string, number> = {
  floaters: 3,
  flashes: 3,
  sudden_loss: 4,
};

export const submitDetails = mutation({
  args: {
    reason: reasonValidator,
    conditions: v.array(conditionValidator),
    symptoms: v.array(symptomValidator),
    lastDilation: lastDilationValidator,
    oneSentenceSummary: v.optional(v.string()),
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
    const score = computeScore(args.reason, args.conditions, args.symptoms, args.lastDilation);
    const level = score >= 4 ? "ALTA" : score >= 2 ? "POSSIVEL" : "BAIXA";

    const existing = await ctx.db
      .query("appointment_details")
      .withIndex("by_appointment_id", (q) => q.eq("appointmentId", activeAppointment._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        reason: args.reason,
        conditions: args.conditions,
        symptoms: args.symptoms,
        lastDilation: args.lastDilation,
        oneSentenceSummary: args.oneSentenceSummary,
        dilatationLevel: level,
        dilatationScore: score,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("appointment_details", {
        appointmentId: activeAppointment._id,
        clerkUserId,
        reason: args.reason,
        conditions: args.conditions,
        symptoms: args.symptoms,
        lastDilation: args.lastDilation,
        oneSentenceSummary: args.oneSentenceSummary,
        dilatationLevel: level,
        dilatationScore: score,
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
      score,
      level,
      advisory: "A decisao final sobre dilatacao e sempre feita no consultorio.",
    };
  },
});

function computeScore(
  reason: string,
  conditions: string[],
  symptoms: string[],
  lastDilation: string,
) {
  const conditionsTotal = conditions.reduce((sum, item) => sum + (conditionScore[item] ?? 0), 0);
  const symptomsTotal = symptoms.reduce((sum, item) => sum + (symptomScore[item] ?? 0), 0);
  const reasonTotal = reasonScore[reason] ?? 0;
  const dilationAdjustment = lastDilation === "lt6m" ? -1 : 0;

  return reasonTotal + conditionsTotal + symptomsTotal + dilationAdjustment;
}
