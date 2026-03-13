import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ de agendamento | Minha Agenda",
  description:
    "Regras de taxa de reserva, remarcação, cancelamento, reembolso e no-show.",
  alternates: {
    canonical: "/faq-agendamento",
  },
};

const faqPolicies = [
  {
    label: "Pagamento",
    tag: "Taxa de reserva",
    title: "O que é a taxa de reserva?",
    description:
      "A taxa de reserva é cobrada para confirmar a intenção de reservar o horário, e o restante é pago no atendimento.",
    points: [
      "A taxa confirma a intenção de reservar o horário.",
      "O saldo restante é pago no atendimento.",
      "Em cancelamentos com mais de 24h de antecedência, o reembolso da taxa é integral.",
    ],
    fullWidth: false,
  },
  {
    label: "Remarcação",
    tag: "Janela de 24h",
    title: "Como funciona remarcação e cancelamento?",
    description:
      "Reagendamentos e cancelamentos são permitidos até 24h antes do início da consulta.",
    points: [
      "Você tem 1 remarcação sem custo.",
      "A partir da segunda remarcação, é necessária nova taxa de reserva, sem abatimento.",
      "Com menos de 24h, remarcação e cancelamento ficam bloqueados no app e seguem apenas por WhatsApp.",
    ],
    fullWidth: false,
  },
  {
    label: "Ausência",
    tag: "No-show",
    title: "Reembolso, no-show e nova reserva",
    description: "Em caso de não comparecimento, a taxa de reserva é retida.",
    points: [
      "Quando ocorre no-show, a reserva é cancelada e marcada como ausência.",
      "Após o no-show, um novo agendamento deve ser iniciado do zero.",
      "A nova reserva exige nova taxa de reserva.",
    ],
    fullWidth: true,
  },
] as const;

export default function FaqAgendamentoPage() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 pt-4 md:space-y-8 md:pt-8">
      <div className="space-y-2">
        <Badge
          variant="outline"
          className="border-primary/20 bg-primary/5 text-primary"
        >
          Transparência no agendamento
        </Badge>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          FAQ e políticas de agendamento
        </h1>
        <CardDescription className="max-w-3xl text-sm text-muted-foreground md:text-base">
          Regras de pagamento, remarcação, cancelamento, reembolso e no-show.
        </CardDescription>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {faqPolicies.map((item) => (
          <Card
            key={item.title}
            className={[
              "rounded-2xl border-border/70 bg-linear-to-b from-card to-card/70 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              item.fullWidth ? "md:col-span-2" : "",
            ].join(" ")}
          >
            <CardHeader className="space-y-3 pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline" className="border-border/80">
                  {item.label}
                </Badge>
                <Badge variant="secondary">{item.tag}</Badge>
              </div>
              <h2 className="text-base font-medium text-foreground">
                {item.title}
              </h2>
              <CardDescription className="text-sm text-foreground/85">
                {item.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-5">
              <ul className="space-y-2 text-sm text-muted-foreground">
                {item.points.map((point) => (
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

      <div>
        <Button variant="outline" asChild>
          <Link href="/">Voltar para agendamento</Link>
        </Button>
      </div>
    </section>
  );
}
