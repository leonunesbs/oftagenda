import { query } from "./_generated/server";

export const getScheduleAndHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();

    const events = await ctx.db
      .query("appointment_events")
      .withIndex("by_clerk_user_id_and_created_at", (q) => q.eq("clerkUserId", clerkUserId))
      .collect();

    const upcoming = appointments
      .filter((item) => item.status === "confirmed" || item.status === "rescheduled")
      .sort((a, b) => b.requestedAt - a.requestedAt);

    const history = [...events].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);

    return { upcoming, history };
  },
});
