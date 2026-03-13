import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Reserva | Minha Agenda",
  description:
    "Regras para taxa de reserva, remarcação e cancelamento do agendamento.",
  alternates: {
    canonical: "/politica-de-reserva",
  },
};

const reserveFlow = [
  {
    step: "Etapa 1",
    title: "Confirmação do horário",
    description:
      "A taxa de reserva funciona como sinal para confirmar o horário selecionado.",
  },
  {
    step: "Etapa 2",
    title: "Comparecimento à consulta",
    description:
      "No dia da consulta, a taxa de reserva é abatida do valor total do atendimento.",
  },
  {
    step: "Etapa 3",
    title: "Remarcação e cancelamento",
    description:
      "Remarcações e cancelamentos automáticos são permitidos até 24 horas antes do horário agendado.",
  },
] as const;

const reserveRules = [
  "Você tem direito a 1 remarcação sem custo.",
  "A partir da segunda remarcação, é cobrada nova taxa de reserva, sem abatimento no valor da consulta.",
  "Com menos de 24 horas, remarcação e cancelamento ficam indisponíveis no app e seguem por WhatsApp.",
  "Após no-show, o agendamento é cancelado e uma nova reserva deve ser iniciada do zero.",
] as const;

export default function ReservaPolicyPage() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 pt-4 md:space-y-8 md:pt-8">
      <header className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -left-28 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative space-y-3">
          <Badge variant="outline" className="border-primary/30 bg-background/90 text-primary">
            Política oficial
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Política de reserva
          </h1>
          <CardDescription className="max-w-3xl text-sm md:text-base">
            Regras claras para confirmação de horário, remarcação e cancelamento.
          </CardDescription>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {reserveFlow.map((item) => (
          <Card key={item.step} className="rounded-2xl border-border/70 bg-card/90">
            <CardHeader className="space-y-2 pb-2">
              <Badge variant="secondary" className="w-fit">
                {item.step}
              </Badge>
              <h2 className="text-base font-medium">{item.title}</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="space-y-2 pb-3">
          <h2 className="text-lg font-semibold tracking-tight">Regras operacionais</h2>
          <CardDescription>
            Consulte os critérios válidos para todos os agendamentos realizados na
            plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {reserveRules.map((rule) => (
              <li key={rule} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/faq-agendamento">Voltar para central de políticas</Link>
        </Button>
        <Button asChild>
          <Link href="/politica-de-reembolso">Ler política de reembolso</Link>
        </Button>
      </div>
    </section>
  );
}
