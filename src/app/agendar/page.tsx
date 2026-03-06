import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { isClerkConfigured } from "@/lib/access";
import { BookingFormContainer } from "@/components/booking-form-container";
import { BookingFormFallback } from "@/components/booking-form-fallback";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

export const metadata: Metadata = {
  title: "Agendar consulta",
  description: "Selecione local, data e horário para iniciar seu agendamento oftalmológico.",
  alternates: {
    canonical: "/agendar",
  },
  openGraph: {
    title: "Agendar consulta | Minha Agenda",
    description: "Fluxo rápido para selecionar local, data e horário da consulta.",
    url: "/agendar",
  },
};

export default async function AgendarPage() {
  const clerkEnabled = isClerkConfigured();
  const userId = clerkEnabled ? (await auth()).userId : null;
  if (userId) {
    try {
      const { client } = await getAuthenticatedConvexHttpClient();
      const dashboardState = await client.query(api.appointments.getDashboardState, {});
      if (dashboardState.hasConfirmedBooking || dashboardState.pendingReservations.length > 0) {
        redirect("/dashboard");
      }
    } catch {
      // If auth token/Convex are unavailable, keep page accessible and enforce rule in mutations.
    }
  }

  return (
    <section className="mx-auto w-full max-w-5xl">
      <Suspense fallback={<BookingFormFallback />}>
        <BookingFormContainer
          isAuthenticated={Boolean(userId)}
          clerkEnabled={clerkEnabled}
        />
      </Suspense>
    </section>
  );
}
