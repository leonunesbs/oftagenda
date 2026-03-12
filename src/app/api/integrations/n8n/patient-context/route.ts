import { NextResponse } from "next/server";

import { api } from "@convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-server";
import { n8nPatientContextSchema } from "@/lib/integrations/n8n-schemas";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = n8nPatientContextSchema.safeParse({
    phone: url.searchParams.get("phone"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Parâmetro phone inválido.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const client = getConvexHttpClient();
    const result = await client.query(api.n8n.getPatientContextByPhone, {
      phone: parsed.data.phone,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao consultar contexto do paciente.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
