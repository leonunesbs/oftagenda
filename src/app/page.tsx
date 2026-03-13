import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

import { BookingFormContainer } from "@/components/booking-form-container";
import { BookingFormFallback } from "@/components/booking-form-fallback";
import { ScrollToIdButton } from "@/components/scroll-to-id-button";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { isClerkConfigured } from "@/lib/access";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Oftalmologista em Fortaleza | Consulta de Retina e Catarata",
  description:
    "Agendamento oftalmológico para pacientes da Minha Agenda. Selecione local, data e horário em poucos passos.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Minha Agenda | Agendamento Oftalmológico",
    description:
      "Acesse sua agenda e confirme a consulta oftalmológica com fluxo rápido e objetivo.",
    type: "website",
    locale: "pt_BR",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Minha Agenda | Agendamento Oftalmológico",
    description: "Fluxo direto para agendar consulta oftalmológica.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const physicianSchema = {
  "@context": "https://schema.org",
  "@type": "Physician",
  name: "Dr. Leonardo Nunes",
  medicalSpecialty: ["Ophthalmology"],
  areaServed: [
    "Fortaleza - CE",
    "São Domingos do Maranhão - MA",
    "Fortuna - MA",
  ],
  knowsAbout: [
    "Consulta oftalmológica",
    "Retina clínica e cirúrgica",
    "Cirurgia de catarata",
    "Atendimento humanizado",
  ],
};

const clinicSchema = {
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  name: "Minha Agenda - Oftalmologia",
  medicalSpecialty: ["Ophthalmology"],
  areaServed: [
    "Fortaleza - CE",
    "São Domingos do Maranhão - MA",
    "Fortuna - MA",
  ],
  availableService: [
    {
      "@context": "https://schema.org",
      "@type": "MedicalProcedure",
      name: "Consulta oftalmológica completa",
    },
    {
      "@context": "https://schema.org",
      "@type": "MedicalProcedure",
      name: "Avaliação de retina",
    },
    {
      "@context": "https://schema.org",
      "@type": "MedicalProcedure",
      name: "Avaliação para cirurgia de catarata",
    },
  ],
};

export default async function HomePage() {
  const clerkEnabled = isClerkConfigured();
  const oftleonardoContentUrl = `${siteConfig.social.oftleonardoSite}/conteudos?utm_source=oftagenda&utm_medium=referral&utm_campaign=crossdomain_seo`;

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 pt-4 md:gap-8 md:pt-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top,rgba(120,148,255,0.18),transparent_58%)] blur-2xl" />
      <script
        id="physician-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(physicianSchema),
        }}
      />
      <script
        id="clinic-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(clinicSchema),
        }}
      />

      <section aria-labelledby="home-hero">
        <Card className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-500 rounded-3xl border-white/10 bg-linear-to-br from-card/95 via-card/90 to-card/65 backdrop-blur-2xl">
          <CardHeader className="space-y-4">
            <p className="inline-flex w-fit rounded-full border border-border/70 bg-muted/30 px-3 py-1 text-xs text-foreground/90">
              Atendimento oftalmológico especializado
            </p>
            <h1
              id="home-hero"
              className="max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl"
            >
              Minha Agenda
            </h1>
            <CardDescription className="max-w-2xl text-sm text-foreground/90 md:text-base">
              Aqui, cada paciente é atendido com tempo, clareza e precisão
              clínica.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <ScrollToIdButton
              className="h-10 px-5 text-sm transition-transform duration-200 hover:-translate-y-0.5"
              targetId="agendamento"
            >
              Agendar
            </ScrollToIdButton>
            {clerkEnabled ? (
              <Button
                variant="secondary"
                asChild
                className="h-10 px-5 text-sm transition-colors duration-200"
              >
                <Link href="/dashboard" prefetch={false}>
                  Painel
                </Link>
              </Button>
            ) : (
              <Button
                variant="secondary"
                disabled
                className="h-10 px-5 text-sm transition-colors duration-200"
              >
                Clerk não configurado
              </Button>
            )}
            <p className="w-full text-xs text-foreground/90">
              Protocolo clínico com foco em precisão diagnóstica e conduta
              segura.
            </p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="home-diferenciais">
        <h2 id="home-diferenciais" className="sr-only">
          Diferenciais do atendimento
        </h2>
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          <Card className="rounded-2xl border-border/70 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500">
            <CardHeader className="space-y-2 pb-3">
              <h3 className="text-base font-medium">Atendimento individual</h3>
              <CardDescription className="text-sm">
                Consulta personalizada para o seu caso.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-border/70 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 motion-safe:delay-100">
            <CardHeader className="space-y-2 pb-3">
              <h3 className="text-base font-medium">
                Tecnologia de alta precisão
              </h3>
              <CardDescription className="text-sm">
                Diagnóstico claro e conduta objetiva.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-border/70 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500 motion-safe:delay-200">
            <CardHeader className="space-y-2 pb-3">
              <h3 className="text-base font-medium">Segurança em cada etapa</h3>
              <CardDescription className="text-sm">
                Fluxo direto do agendamento ao resumo.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section aria-labelledby="home-conteudos-relacionados">
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="space-y-2">
            <h2
              id="home-conteudos-relacionados"
              className="text-xl font-semibold tracking-tight"
            >
              Conteúdos de apoio para sua jornada
            </h2>
            <CardDescription>
              Entenda exames, sintomas e orientações antes da consulta em nosso
              hub educativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link
                href={oftleonardoContentUrl}
                prefetch={false}
                target="_blank"
                rel="noreferrer"
              >
                Abrir hub de conteúdos
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                href={`${siteConfig.social.oftleonardoSite}/acuidade-visual?utm_source=oftagenda&utm_medium=referral&utm_campaign=crossdomain_seo`}
                prefetch={false}
                target="_blank"
                rel="noreferrer"
              >
                Teste de acuidade visual
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section
        id="agendamento"
        aria-labelledby="home-agendamento"
        className="scroll-mt-24"
      >
        <div className="mx-auto w-full max-w-5xl space-y-3">
          <h2
            id="home-agendamento"
            className="text-xl font-semibold tracking-tight md:text-2xl"
          >
            Agendamento
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Escolha local, data e horário e avance para o resumo.
          </p>
        </div>
        <div className="mx-auto mt-4 w-full max-w-5xl">
          <Suspense fallback={<BookingFormFallback />}>
            <BookingFormContainer
              isAuthenticated={false}
              clerkEnabled={clerkEnabled}
            />
          </Suspense>
        </div>
        {!clerkEnabled ? (
          <p className="mx-auto mt-3 w-full max-w-5xl text-xs text-muted-foreground">
            Configure as chaves do Clerk no `.env.local` para habilitar a
            autenticação.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="home-politicas">
        <Card className="rounded-2xl border-border/70">
          <CardHeader className="space-y-2">
            <h2
              id="home-politicas"
              className="text-xl font-semibold tracking-tight md:text-2xl"
            >
              Dúvidas sobre políticas
            </h2>
            <CardDescription className="max-w-3xl">
              Acesse as políticas oficiais com regras de reserva, remarcação,
              cancelamento, reembolso e no-show.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/faq-agendamento">Ver políticas de agendamento</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
