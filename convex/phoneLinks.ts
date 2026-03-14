import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const RATE_LIMIT_MAX_TOKENS = 3;

function normalizePhone(rawPhone: string) {
  const digits = rawPhone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : "";
}

export const createPhoneLinkToken = mutation({
  args: {
    phone: v.string(),
    email: v.string(),
    token: v.string(),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhone(args.phone);
    if (!phone) {
      throw new Error("Telefone inválido.");
    }

    const email = args.email.trim().toLowerCase();
    if (!email) {
      throw new Error("Email obrigatório.");
    }

    let resolvedClerkUserId = args.clerkUserId?.trim();
    if (!resolvedClerkUserId) {
      const allPatients = await ctx.db.query("patients").collect();
      const patient = allPatients.find(
        (p) => p.email.trim().toLowerCase() === email,
      );
      if (!patient) {
        throw new Error("Nenhuma conta encontrada com esse email.");
      }
      resolvedClerkUserId = patient.clerkUserId;
    }

    const now = Date.now();
    const recentTokens = await ctx.db
      .query("phone_link_tokens")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .collect();
    const tokensInWindow = recentTokens.filter(
      (t) => t.createdAt > now - RATE_LIMIT_WINDOW_MS,
    );
    if (tokensInWindow.length >= RATE_LIMIT_MAX_TOKENS) {
      throw new Error(
        "Limite de solicitações atingido. Aguarde alguns minutos e tente novamente.",
      );
    }

    await ctx.db.insert("phone_link_tokens", {
      token: args.token,
      phone,
      clerkUserId: resolvedClerkUserId,
      expiresAt: now + TOKEN_TTL_MS,
      used: false,
      createdAt: now,
    });

    return {
      token: args.token,
      clerkUserId: resolvedClerkUserId,
    };
  },
});

export const confirmPhoneLink = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const tokenDoc = await ctx.db
      .query("phone_link_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!tokenDoc) {
      throw new Error("Link de verificação inválido.");
    }

    if (tokenDoc.used) {
      throw new Error("Este link já foi utilizado.");
    }

    const now = Date.now();
    if (now > tokenDoc.expiresAt) {
      throw new Error(
        "Link de verificação expirado. Solicite um novo pelo painel ou por um canal de atendimento.",
      );
    }

    await ctx.db.patch(tokenDoc._id, { used: true });

    const existingLink = await ctx.db
      .query("phone_links")
      .withIndex("by_phone", (q) => q.eq("phone", tokenDoc.phone))
      .first();

    if (existingLink) {
      await ctx.db.patch(existingLink._id, {
        clerkUserId: tokenDoc.clerkUserId,
        verifiedAt: now,
      });
    } else {
      await ctx.db.insert("phone_links", {
        phone: tokenDoc.phone,
        clerkUserId: tokenDoc.clerkUserId,
        verifiedAt: now,
        createdAt: now,
      });
    }

    return { ok: true, phone: tokenDoc.phone };
  },
});

export const getPhoneLinkStatus = query({
  args: {
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhone(args.phone);
    if (!phone) {
      return { linked: false };
    }

    const link = await ctx.db
      .query("phone_links")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();

    if (!link) {
      return { linked: false };
    }

    return {
      linked: true,
      clerkUserId: link.clerkUserId,
      verifiedAt: link.verifiedAt,
    };
  },
});

export const getPhoneLinkByClerkUser = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("phone_links")
      .withIndex("by_clerk_user_id", (q) =>
        q.eq("clerkUserId", args.clerkUserId),
      )
      .first();

    if (!link) {
      return null;
    }

    return {
      phone: link.phone,
      verifiedAt: link.verifiedAt,
    };
  },
});

export const revokePhoneLink = mutation({
  args: {
    phone: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const phone = normalizePhone(args.phone);
    if (!phone) {
      throw new Error("Telefone inválido.");
    }

    const link = await ctx.db
      .query("phone_links")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();

    if (!link) {
      throw new Error("Nenhuma vinculação encontrada para este telefone.");
    }

    if (link.clerkUserId !== args.clerkUserId) {
      throw new Error("Vinculação não pertence a este usuário.");
    }

    await ctx.db.delete(link._id);
    return { ok: true };
  },
});
