import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  bookingLegalReferences,
  bookingPolicySections,
} from "@/lib/booking-policies";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Políticas de agendamento | Minha Agenda",
  description:
    "Políticas de reserva, cancelamento, reembolso, reagendamento e proteção de dados.",
  alternates: {
    canonical: "/faq-agendamento",
  },
};

export default function FaqAgendamentoPage() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 pt-4 md:space-y-8 md:pt-8">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-28 -top-28 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative space-y-3">
          <Badge
            variant="outline"
            className="border-primary/30 bg-background/90 text-primary"
          >
            Central de políticas
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Políticas de agendamento
          </h1>
          <CardDescription className="max-w-3xl text-sm text-muted-foreground md:text-base">
            Regras de reserva, cancelamento, reembolso, reagendamento, proteção
            de dados e conformidade regulatória.
          </CardDescription>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {bookingPolicySections.map((section) => (
          <Card
            key={section.id}
            id={section.id}
            className="scroll-mt-24 rounded-2xl border-border/70 bg-linear-to-b from-card to-card/80 shadow-xs"
          >
            <CardHeader className="space-y-3 pb-3">
              <Badge variant="outline" className="w-fit border-border/80">
                {section.label}
              </Badge>
              <h2 className="text-base font-medium text-foreground">
                {section.title}
              </h2>
              <CardDescription className="text-sm text-foreground/85">
                {section.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-border/70 bg-linear-to-b from-card to-card/80 shadow-xs">
        <CardHeader className="space-y-3 pb-3">
          <Badge variant="outline" className="w-fit border-border/80">
            Referências legais
          </Badge>
          <h2 className="text-base font-medium text-foreground">
            Base regulatória
          </h2>
          <CardDescription className="text-sm text-foreground/85">
            Normas que orientam as políticas desta plataforma de agendamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {bookingLegalReferences.map((ref) => (
              <li key={ref.label} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>
                  <strong className="font-medium text-foreground">
                    {ref.label}
                  </strong>{" "}
                  — {ref.text}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <Link href="/">Voltar para início</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/#agendamento">Ir para agendamento</Link>
        </Button>
      </div>
    </section>
  );
}
