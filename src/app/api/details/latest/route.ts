import { NextResponse } from "next/server"

import { api } from "@convex/_generated/api"
import { decryptTriagePayload } from "@/lib/triage-e2e-server"
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server"

export async function GET() {
  try {
    const { client } = await getAuthenticatedConvexHttpClient()
    const details = await client.query(api.triage.getLatestEncryptedDetails, {})

    if (!details) {
      return NextResponse.json({ ok: true, details: null })
    }

    const payload = await decryptTriagePayload(details.encryptedPayload)
    return NextResponse.json({
      ok: true,
      details: {
        payload,
        score: details.score,
        level: details.level,
        updatedAt: details.updatedAt,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao buscar detalhes."
    const status = message.toLowerCase().includes("not authenticated") ? 401 : 500
    return NextResponse.json({ ok: false, error: message }, { status })
  }
}
