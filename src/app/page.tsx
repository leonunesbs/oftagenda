import Link from "next/link";

import { HomeAvailability } from "@/components/home-availability";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isClerkConfigured } from "@/lib/access";

export default async function HomePage() {
  const clerkEnabled = isClerkConfigured();

  return (
    <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 pt-6 md:pt-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top,rgba(120,148,255,0.18),transparent_58%)] blur-2xl" />

      <Card className="animate-in fade-in slide-in-from-top-2 duration-500 rounded-3xl border-white/10 bg-linear-to-br from-card/95 via-card/90 to-card/65 backdrop-blur-2xl">
        <CardHeader className="space-y-3">
          <p className="text-sm text-muted-foreground">Área exclusiva do paciente</p>
          <CardTitle className="text-3xl tracking-tight md:text-5xl">Minha Agenda</CardTitle>
          <CardDescription className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Organize consultas com uma experiência fluida: escolha a data no calendário e selecione os
            horários disponíveis em segundos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              className="h-9 rounded-xl px-4 text-sm"
            >
              <Link href="/sign-in">Entrar</Link>
            </Button>
            <Button
              variant="secondary"
              asChild
              className="h-9 rounded-xl px-4 text-sm"
            >
              <Link href="/agendar">Agendar agora</Link>
            </Button>
          </div>

          <HomeAvailability />

          {!clerkEnabled ? (
            <p className="text-xs text-muted-foreground">
              Configure as chaves do Clerk no `.env.local` para habilitar a autenticação.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}