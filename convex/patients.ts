import { query } from "./_generated/server";

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
