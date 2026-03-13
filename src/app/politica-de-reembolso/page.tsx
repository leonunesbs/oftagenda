import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Reembolso | Minha Agenda",
  description:
    "Critérios para reembolso da taxa de reserva em cancelamentos e ausência.",
  alternates: {
    canonical: "/politica-de-reembolso",
  },
};

const refundMatrix = [
  {
    label: "Cancelamento > 24h",
    outcome: "Reembolso integral",
    detail: "A taxa de reserva é devolvida integralmente.",
  },
  {
    label: "Cancelamento < 24h",
    outcome: "Sem reembolso automático",
    detail: "A solicitação deve seguir somente por WhatsApp para avaliação.",
  },
  {
    label: "No-show",
    outcome: "Taxa retida",
    detail: "A reserva é cancelada por ausência e a taxa não é reembolsada.",
  },
] as const;

const importantNotes = [
  "No comparecimento, a taxa de reserva é abatida no valor total da consulta.",
  "Quando ocorre no-show, um novo agendamento deve ser feito do zero.",
  "A nova reserva após no-show exige nova taxa de reserva.",
] as const;

export default function RefundPolicyPage() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 pt-4 md:space-y-8 md:pt-8">
      <header className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative space-y-3">
          <Badge variant="outline" className="border-primary/30 bg-background/90 text-primary">
            Política oficial
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Política de reembolso
          </h1>
          <CardDescription className="max-w-3xl text-sm md:text-base">
            Veja os critérios para devolução da taxa de reserva em cada cenário de
            cancelamento ou ausência.
          </CardDescription>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {refundMatrix.map((item) => (
          <Card key={item.label} className="rounded-2xl border-border/70 bg-card/90">
            <CardHeader className="space-y-2 pb-2">
              <Badge variant="outline" className="w-fit border-border/80">
                {item.label}
              </Badge>
              <h2 className="text-base font-medium">{item.outcome}</h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-border/70">
        <CardHeader className="space-y-2 pb-3">
          <h2 className="text-lg font-semibold tracking-tight">Observações importantes</h2>
          <CardDescription>
            Diretrizes válidas para todos os pagamentos de taxa de reserva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {importantNotes.map((note) => (
              <li key={note} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span>{note}</span>
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
          <Link href="/politica-de-reserva">Ler política de reserva</Link>
        </Button>
      </div>
    </section>
  );
}
