import { NextResponse } from "next/server";

import type { Id } from "@convex/_generated/dataModel";
import { api } from "@convex/_generated/api";
import { getConvexHttpClient } from "@/lib/convex-server";
import { requireN8nApiKey } from "@/lib/integrations/n8n-auth";
import { n8nCancelAppointmentSchema } from "@/lib/integrations/n8n-schemas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authError = requireN8nApiKey(request);
  if (authError) {
    return authError;
  }

  const body = await request.json().catch(() => null);
  const parsed = n8nCancelAppointmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload inválido para cancelamento.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const client = getConvexHttpClient();
    const result = await client.mutation(api.n8n.cancelAppointmentByPhone, {
      appointmentId: parsed.data.appointmentId as Id<"appointments">,
      phone: parsed.data.phone,
      reason: parsed.data.reason,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao cancelar agendamento via integração n8n.";
    const status = /não encontrado|invalido|inválido|corresponde/i.test(message) ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
