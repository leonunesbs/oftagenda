import { formatMoney, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminUsersPage() {
  const data = await getAdminSnapshot();

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Usuários</CardTitle>
        <CardDescription>Atividade agregada por usuário Clerk.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.users.map((user) => (
          <div key={user.clerkUserId} className="rounded-lg border p-3">
            <p className="font-medium">{user.name ?? "Sem nome"}</p>
            <p className="text-xs text-muted-foreground">{user.clerkUserId}</p>
            <p className="text-xs text-muted-foreground">
              {user.email ?? "sem email"} - {user.phone ?? "sem telefone"}
            </p>
            <p className="text-xs text-muted-foreground">
              Reservas: {user.reservationsCount} | Agendamentos: {user.appointmentsCount} | Pagamentos:{" "}
              {user.paymentsCount} | Pago: {formatMoney(user.paidAmountCents)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
