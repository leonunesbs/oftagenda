import { NextResponse } from "next/server"

import { api } from "@convex/_generated/api"
import { triageSchema } from "@/domain/triage/schema"
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = triageSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Payload de detalhes inválido.",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    )
  }

  try {
    const { client } = await getAuthenticatedConvexHttpClient()
    const result = await client.mutation(api.triage.submitDetails, parsed.data)
    return NextResponse.json({
      ok: true,
      result,
      todo: "Vincular appointmentId com sistema externo de agenda quando integrar Cal.com.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao salvar detalhes."
    const status = message.toLowerCase().includes("not authenticated") ? 401 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
