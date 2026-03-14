import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime24h, formatMoney, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";

const quickSections = [
  { href: "/dashboard/admin/agenda", title: "Agenda", description: "Calendario semanal/diario para operacao assistida." },
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
    const now = Date.now();
    const upcomingReservations = data.reservations
      .filter((reservation) => reservation.startsAt >= now && reservation.status !== "cancelled")
      .sort((a, b) => a.startsAt - b.startsAt)
      .slice(0, 5);

    const weekFromNow = now + 7 * 24 * 60 * 60_000;
    const confirmedWeek = data.reservations.filter(
      (reservation) =>
        reservation.status === "confirmed" && reservation.startsAt >= now && reservation.startsAt <= weekFromNow,
    ).length;
    const confirmedToday = data.reservations.filter((reservation) => {
      if (reservation.status !== "confirmed") {
        return false;
      }
      const date = new Date(reservation.startsAt);
      const today = new Date(now);
      return (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );
    }).length;

    const kpis = [
      { label: "Confirmados hoje", value: String(confirmedToday), helper: "operacao diaria" },
      { label: "Confirmados 7 dias", value: String(confirmedWeek), helper: "janela semanal" },
      { label: "Reservas pendentes", value: String(data.metrics.pendingReservations), helper: "acao recomendada" },
      { label: "Pacientes ativos", value: String(data.metrics.patients), helper: "cadastros unicos" },
      { label: "Receita paga", value: formatMoney(data.metrics.paidRevenueCents), helper: "pagamentos liquidados" },
      { label: "Eventos ativos", value: String(data.metrics.activeEvents), helper: "consulta, exame e procedimento" },
    ];

    return (
      <div className="space-y-6">
        <Card variant="flat-mobile" className="border-border/70">
          <CardHeader>
            <CardTitle>Radar operacional</CardTitle>
            <CardDescription>
              Indicadores de agendamento, atendimento e financeiro em um unico painel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                  <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{kpi.helper}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card variant="flat-mobile" className="border-border/70">
          <CardHeader>
            <CardTitle>Proximos atendimentos</CardTitle>
            <CardDescription>Reservas futuras para acompanhamento rapido da agenda.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horario</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingReservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                        Nenhuma reserva futura encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    upcomingReservations.map((reservation) => (
                      <TableRow key={reservation._id}>
                        <TableCell>{formatDateTime24h(reservation.startsAt)}</TableCell>
                        <TableCell>{reservation.eventTypeTitle}</TableCell>
                        <TableCell>
                          <Badge variant={reservation.status === "confirmed" ? "default" : "outline"}>
                            {reservation.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{reservation.clerkUserId}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card variant="flat-mobile" className="border-border/70">
          <CardHeader>
            <CardTitle>Seções rápidas</CardTitle>
            <CardDescription>Navegação para os módulos administrativos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seção</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-[150px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quickSections.map((section) => (
                    <TableRow key={section.href}>
                      <TableCell className="font-medium">{section.title}</TableCell>
                      <TableCell className="text-muted-foreground">{section.description}</TableCell>
                      <TableCell>
                        <Button asChild size="sm">
                          <Link href={section.href}>Abrir</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao carregar dados administrativos. Verifique a integração Clerk + Convex.";

    return (
      <Card variant="flat-mobile" className="border-border/70">
        <CardHeader>
          <CardTitle>Painel administrativo indisponível</CardTitle>
          <CardDescription>Não foi possível autenticar sua sessão no Convex para carregar o painel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{message}</p>
          <p>
            Verifique se o usuário possui papel <code>admin</code> na tabela <code>user_roles</code> do Convex.
          </p>
        </CardContent>
      </Card>
    );
  }
}
