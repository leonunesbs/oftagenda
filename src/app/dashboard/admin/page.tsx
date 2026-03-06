import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Métrica</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Eventos</TableCell>
                    <TableCell>{data.metrics.events}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Disponibilidades</TableCell>
                    <TableCell>{data.metrics.availabilities}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Reservas</TableCell>
                    <TableCell>{data.metrics.reservations}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pacientes</TableCell>
                    <TableCell>{data.metrics.patients}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Usuários ativos</TableCell>
                    <TableCell>{data.metrics.users}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pagamentos</TableCell>
                    <TableCell>{data.metrics.payments}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Pagos</TableCell>
                    <TableCell>{data.metrics.paidPayments}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Receita</TableCell>
                    <TableCell>{formatMoney(data.metrics.paidRevenueCents)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Eventos da agenda</TableCell>
                    <TableCell>{data.metrics.appointmentEvents}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
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
