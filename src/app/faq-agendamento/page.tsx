import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Central de políticas | Minha Agenda",
  description:
    "Consulte as políticas de reserva e reembolso com linguagem clara e objetiva.",
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
          <Badge variant="outline" className="border-primary/30 bg-background/90 text-primary">
            Central de atendimento
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            FAQ de agendamento e políticas
          </h1>
          <CardDescription className="max-w-3xl text-sm text-muted-foreground md:text-base">
            Tudo o que você precisa para reservar com segurança: regras de reserva,
            remarcação, cancelamento, reembolso e no-show.
          </CardDescription>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="rounded-2xl border-border/70 bg-linear-to-b from-card to-card/80 shadow-xs">
          <CardHeader className="space-y-3 pb-3">
            <Badge variant="outline" className="w-fit border-border/80">
              Política 01
            </Badge>
            <h2 className="text-base font-medium text-foreground">Política de reserva</h2>
            <CardDescription className="text-sm text-foreground/85">
              Entenda taxa de reserva, janela de remarcação, cancelamento e regras
              para confirmar seu horário.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full justify-between" asChild>
              <Link href="/politica-de-reserva">Acessar política de reserva</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/70 bg-linear-to-b from-card to-card/80 shadow-xs">
          <CardHeader className="space-y-3 pb-3">
            <Badge variant="outline" className="w-fit border-border/80">
              Política 02
            </Badge>
            <h2 className="text-base font-medium text-foreground">Política de reembolso</h2>
            <CardDescription className="text-sm text-foreground/85">
              Consulte quando há reembolso integral, quando a taxa é retida e como
              funciona após ausência.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full justify-between" asChild>
              <Link href="/politica-de-reembolso">
                Acessar política de reembolso
              </Link>
            </Button>
          </CardContent>
        </Card>
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
