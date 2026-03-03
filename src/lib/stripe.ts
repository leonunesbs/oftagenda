import Stripe from "stripe";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2026-02-25.clover";

function isPlaceholderValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.includes("replace-me") || normalized.includes("your_");
}

export function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY não configurada.");
  }
  if (isPlaceholderValue(secretKey)) {
    throw new Error("STRIPE_SECRET_KEY parece placeholder. Atualize com a chave real.");
  }
  if (!secretKey.startsWith("sk_")) {
    throw new Error("STRIPE_SECRET_KEY inválida. Esperado prefixo sk_.");
  }
  return secretKey;
}

export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET não configurada.");
  }
  if (isPlaceholderValue(webhookSecret)) {
    throw new Error("STRIPE_WEBHOOK_SECRET parece placeholder. Atualize com o valor real.");
  }
  if (!webhookSecret.startsWith("whsec_")) {
    throw new Error("STRIPE_WEBHOOK_SECRET inválida. Esperado prefixo whsec_.");
  }
  return webhookSecret;
}

export function getStripeClient() {
  return new Stripe(getStripeSecretKey(), {
    apiVersion: STRIPE_API_VERSION,
    appInfo: {
      name: "oftagenda",
    },
  });
}

export function isStripeConfigured() {
  try {
    getStripeSecretKey();
    return true;
  } catch {
    return false;
  }
}

