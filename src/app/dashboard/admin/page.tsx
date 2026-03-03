import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";

const quickSections = [
  { href: "/dashboard/admin/eventos", title: "Eventos", description: "CRUD de eventos e reservas por evento." },
  {
    href: "/dashboard/admin/disponibilidade",
    title: "Disponibilidade",
    description: "Gerenciamento de grupos e faixas de horários.",
  },
  { href: "/dashboard/admin/reservas", title: "Reservas", description: "Atualização rápida de status e observações." },
  { href: "/dashboard/admin/pagamentos", title: "Pagamentos", description: "Registro e status de pagamentos." },
  { href: "/dashboard/admin/usuarios", title: "Usuários", description: "Atividade agregada por usuário Clerk." },
  {
    href: "/dashboard/admin/agenda-eventos",
    title: "Eventos da agenda",
    description: "Últimos eventos operacionais dos agendamentos.",
  },
];

export default async function AdminDashboardPage() {
  try {
    const data = await getAdminSnapshot();
    return (
      <div className="space-y-6">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Painel administrativo</CardTitle>
            <CardDescription>
              Ferramentas de operação conectadas ao Convex e protegidas por Clerk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
              <p>Eventos: {data.metrics.events}</p>
              <p>Disponibilidades: {data.metrics.availabilities}</p>
              <p>Reservas: {data.metrics.reservations}</p>
              <p>Pacientes: {data.metrics.patients}</p>
              <p>Usuários ativos: {data.metrics.users}</p>
              <p>Pagamentos: {data.metrics.payments}</p>
              <p>Pagos: {data.metrics.paidPayments}</p>
              <p>Receita: {formatMoney(data.metrics.paidRevenueCents)}</p>
              <p>Eventos de agenda: {data.metrics.appointmentEvents}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {quickSections.map((section) => (
            <Card key={section.href} className="border-border/70">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={section.href}>Abrir {section.title.toLowerCase()}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao carregar dados administrativos. Verifique a integração Clerk + Convex.";

    return (
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Painel administrativo indisponível</CardTitle>
          <CardDescription>Não foi possível autenticar sua sessão no Convex para carregar o painel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{message}</p>
          <p>
            Verifique apenas se o usuário possui <code>public_metadata.role = &quot;admin&quot;</code>.
          </p>
        </CardContent>
      </Card>
    );
  }
}
