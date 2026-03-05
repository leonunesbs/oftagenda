import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { isClerkConfigured } from "@/lib/access";
import { BookingFormContainer } from "@/components/booking-form-container";
import { BookingFormFallback } from "@/components/booking-form-fallback";

export const metadata: Metadata = {
  title: "Agendar consulta",
  description: "Selecione local, data e horário para iniciar seu agendamento oftalmologico.",
  alternates: {
    canonical: "/agendar",
  },
  openGraph: {
    title: "Agendar consulta | Minha Agenda",
    description: "Fluxo rapido para selecionar local, data e horário da consulta.",
    url: "/agendar",
  },
};

export default async function AgendarPage() {
  const clerkEnabled = isClerkConfigured();
  const userId = clerkEnabled ? (await auth()).userId : null;

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
