import { NextResponse } from "next/server";

import {
  bookingLegalReferences,
  bookingPolicySections,
} from "@/lib/booking-policies";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestOrigin = new URL(request.url).origin;

  return NextResponse.json({
    ok: true,
    integration: "oftagenda-n8n",
    source: {
      pagePath: "/faq-agendamento",
      apiPath: "/api/integrations/n8n/faq",
      canonicalUrl: `${requestOrigin}/faq-agendamento`,
      updatedAt: "2026-03-14",
    },
    faq: {
      totalSections: bookingPolicySections.length,
      sections: bookingPolicySections,
      legalReferences: bookingLegalReferences,
    },
  });
}
