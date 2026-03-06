import { NextResponse } from "next/server"
import { z } from "zod/v4"

import { api } from "@convex/_generated/api"
import { encryptedTriagePayloadSchema } from "@/domain/triage/schema"
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server"

const submitEncryptedTriageSchema = z.object({
  encryptedPayload: encryptedTriagePayloadSchema,
  score: z.number().int().min(-1).max(32),
  level: z.enum(["ALTA", "POSSIVEL", "BAIXA"]),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = submitEncryptedTriageSchema.safeParse(body)

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
