import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Políticas de agendamento | Minha Agenda",
  description:
    "Políticas unificadas de reserva, cancelamento, reembolso e reagendamento.",
  alternates: {
    canonical: "/faq-agendamento",
  },
};

const policySections = [
  {
    id: "reserva",
    label: "Política 01",
    title: "Reservas",
    description:
      "A taxa de reserva confirma a intenção de ocupar o horário selecionado.",
    points: [
      "A taxa de reserva funciona como sinal para confirmação do horário.",
      "No comparecimento à consulta, a taxa é abatida no valor total do atendimento.",
      "Após no-show, é necessário iniciar uma nova reserva do zero.",
    ],
  },
  {
    id: "cancelamento",
    label: "Política 02",
    title: "Cancelamentos",
    description:
      "Os cancelamentos seguem uma janela de antecedência para processamento automático.",
    points: [
      "Cancelamentos automáticos são permitidos até 24 horas antes do horário agendado.",
      "Com menos de 24 horas, o cancelamento pelo app fica indisponível e segue via WhatsApp.",
      "No-show cancela automaticamente a reserva por ausência.",
    ],
  },
  {
    id: "reembolso",
    label: "Política 03",
    title: "Reembolsos",
    description:
      "A devolução da taxa de reserva depende do momento e do cenário de cancelamento.",
    points: [
      "Cancelamentos com mais de 24 horas de antecedência têm reembolso integral da taxa.",
      "Cancelamentos com menos de 24 horas não têm reembolso automático.",
      "Em caso de no-show, a taxa de reserva é retida.",
    ],
  },
  {
    id: "reagendamento",
    label: "Política 04",
    title: "Reagendamentos",
    description:
      "As regras de remarcação preservam previsibilidade de agenda e disponibilidade.",
    points: [
      "Você tem direito a 1 reagendamento sem custo.",
      "A partir do segundo reagendamento, é cobrada nova taxa de reserva, sem abatimento.",
      "Com menos de 24 horas, o reagendamento automático no app fica indisponível.",
    ],
  },
] as const;

export default function FaqAgendamentoPage() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6 pt-4 md:space-y-8 md:pt-8">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-28 -top-28 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative space-y-3">
          <Badge variant="outline" className="border-primary/30 bg-background/90 text-primary">
            Central de políticas
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Políticas de agendamento
          </h1>
          <CardDescription className="max-w-3xl text-sm text-muted-foreground md:text-base">
            Página única com as regras de reserva, cancelamento, reembolso e
            reagendamento.
          </CardDescription>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {policySections.map((section) => (
          <Card
            key={section.id}
            id={section.id}
            className="scroll-mt-24 rounded-2xl border-border/70 bg-linear-to-b from-card to-card/80 shadow-xs"
          >
            <CardHeader className="space-y-3 pb-3">
              <Badge variant="outline" className="w-fit border-border/80">
                {section.label}
              </Badge>
              <h2 className="text-base font-medium text-foreground">{section.title}</h2>
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
