import { formatMoney, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminUsersPage() {
  const data = await getAdminSnapshot();

  return (
    <Card variant="flat-mobile" className="border-border/70">
      <CardHeader>
        <CardTitle>Usuários</CardTitle>
        <CardDescription>Atividade agregada por usuário Clerk.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Clerk ID</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Reservas</TableHead>
                <TableHead>Agendamentos</TableHead>
                <TableHead>Pagamentos</TableHead>
                <TableHead>Valor pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.users.map((user) => (
                <TableRow key={user.clerkUserId}>
                  <TableCell className="font-medium">{user.name ?? "Sem nome"}</TableCell>
                  <TableCell className="text-xs">{user.clerkUserId}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.email ?? "sem email"} / {user.phone ?? "sem telefone"}
                  </TableCell>
                  <TableCell>{user.reservationsCount}</TableCell>
                  <TableCell>{user.appointmentsCount}</TableCell>
                  <TableCell>{user.paymentsCount}</TableCell>
                  <TableCell>{formatMoney(user.paidAmountCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
