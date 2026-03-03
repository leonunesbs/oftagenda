import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

function isPlaceholderValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.includes("replace-me") || normalized.includes("your_");
}

export function resolveConvexUrl() {
  const rawUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!rawUrl) {
    throw new Error(
      "Convex URL is not configured. Defina CONVEX_URL (server) ou NEXT_PUBLIC_CONVEX_URL (fallback).",
    );
  }
  if (isPlaceholderValue(rawUrl)) {
    throw new Error(
      "Convex URL parece inválida (placeholder). Atualize CONVEX_URL/NEXT_PUBLIC_CONVEX_URL com a URL real do seu deploy.",
    );
  }

  try {
    const parsed = new URL(rawUrl);
    if (!parsed.protocol.startsWith("http")) {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new Error("Convex URL inválida. Verifique o formato de CONVEX_URL/NEXT_PUBLIC_CONVEX_URL.");
  }

  return rawUrl;
}

export function getConvexHttpClient() {
  return new ConvexHttpClient(resolveConvexUrl());
}

async function getConvexAuthToken(getToken: Awaited<ReturnType<typeof auth>>["getToken"]) {
  try {
    return await getToken({ template: "convex" });
  } catch (error) {
    const status = typeof error === "object" && error !== null ? Reflect.get(error, "status") : null;
    const clerkError =
      typeof error === "object" && error !== null ? Reflect.get(error, "clerkError") : null;
    const isMissingTemplate = clerkError === true && status === 404;

    if (isMissingTemplate) {
      throw new Error(
        "Clerk JWT template 'convex' não encontrado. Crie o template no Clerk com o nome 'convex' para autenticar no Convex.",
      );
    }
    throw error;
  }
}

export async function getAuthenticatedConvexHttpClient() {
  const { userId, getToken } = await auth();
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const token = await getConvexAuthToken(getToken);
  if (!token) {
    throw new Error(
      "Missing Clerk token from template 'convex'. Verifique a configuração de autenticação entre Clerk e Convex.",
    );
  }

  const client = getConvexHttpClient();
  client.setAuth(token);
  return { client, userId };
}
