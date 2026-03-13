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
  title: "Políticas de agendamento | Minha Agenda",
  description:
    "Políticas de reserva, cancelamento, reembolso, reagendamento e proteção de dados.",
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
  {
    id: "dados",
    label: "Política 05",
    title: "Proteção de dados e privacidade",
    description:
      "Seguimos os princípios da LGPD e as diretrizes do CFM para coleta mínima de dados no agendamento.",
    points: [
      "Durante o agendamento, coletamos apenas dados essenciais: nome, contato e horário escolhido.",
      "Nenhum dado clínico ou de saúde é solicitado no momento da reserva — somente durante a consulta.",
      "A coleta mínima atende ao princípio de minimização da LGPD (Lei 13.709/2018, art. 6º, III).",
      "Seus dados pessoais são protegidos por criptografia e acesso restrito.",
    ],
  },
  {
    id: "modelo",
    label: "Política 06",
    title: "Modelo de agendamento",
    description:
      "O agendamento digital funciona como ferramenta administrativa, sem substituir a consulta médica.",
    points: [
      "O sistema de agendamento é classificado como baixo risco pela Resolução CFM 2.454/2026, por se tratar de aplicação administrativa sem impacto em decisões clínicas.",
      "Você escolhe local, data e horário — sem necessidade de informar queixa ou histórico médico.",
      "Informações clínicas complementares podem ser fornecidas de forma opcional após a reserva, na página de detalhes.",
      "A decisão sobre qualquer conduta médica permanece exclusivamente com o profissional de saúde, conforme o Código de Ética Médica.",
    ],
  },
  {
    id: "direitos",
    label: "Política 07",
    title: "Seus direitos",
    description:
      "Você tem direitos garantidos pela LGPD e pelo CFM sobre seus dados e seu atendimento.",
    points: [
      "Você pode solicitar acesso, correção ou exclusão dos seus dados pessoais a qualquer momento.",
      "Você pode revogar consentimentos previamente concedidos, sem prejuízo ao atendimento.",
      "O uso de qualquer tecnologia de apoio no atendimento será sempre informado de forma clara e transparente.",
      "Para exercer seus direitos ou esclarecer dúvidas, entre em contato pelo WhatsApp disponível no site.",
    ],
  },
] as const;

const legalReferences = [
  {
    label: "LGPD",
    text: "Lei 13.709/2018 — Lei Geral de Proteção de Dados Pessoais",
  },
  {
    label: "CFM 2.314/2022",
    text: "Regulamentação da telemedicina no Brasil",
  },
  {
    label: "CFM 2.454/2026",
    text: "Normatização do uso de IA na medicina — sistemas de agendamento como baixo risco",
  },
] as const;

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
            {legalReferences.map((ref) => (
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
