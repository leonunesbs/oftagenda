import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

const API_KEY_HEADER = "x-api-key";
const AUTHORIZATION_HEADER = "authorization";

export function requireN8nApiKey(request: Request) {
  const configured = process.env.N8N_OFTAGENDA_API_KEY?.trim() ?? "";
  if (!configured) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "N8N_OFTAGENDA_API_KEY não configurada no servidor. Defina a variável de ambiente para liberar a integração.",
      },
      { status: 500 },
    );
  }

  const provided = extractProvidedApiKey(request);
  if (!provided || !safeCompare(provided, configured)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Não autorizado para integração n8n.",
      },
      { status: 401 },
    );
  }

  return null;
}

function extractProvidedApiKey(request: Request) {
  const keyFromHeader = request.headers.get(API_KEY_HEADER)?.trim();
  if (keyFromHeader) {
    return keyFromHeader;
  }

  const authorization = request.headers.get(AUTHORIZATION_HEADER)?.trim() ?? "";
  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return "";
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}
