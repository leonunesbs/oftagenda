import { linkWhatsappToUserAction } from "@/app/dashboard/admin/actions";
import { formatMoney, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatWhatsapp(value?: string) {
  if (!value) {
    return "não vinculado";
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const partA = digits.slice(4, 9);
    const partB = digits.slice(9);
    return `+55 (${ddd}) ${partA}-${partB}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    const ddd = digits.slice(2, 4);
    const partA = digits.slice(4, 8);
    const partB = digits.slice(8);
    return `+55 (${ddd}) ${partA}-${partB}`;
  }
  return value;
}

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
                <TableHead>WhatsApp vinculado</TableHead>
                <TableHead>Reservas</TableHead>
                <TableHead>Agendamentos</TableHead>
                <TableHead>Pagamentos</TableHead>
                <TableHead>Valor pago</TableHead>
                <TableHead className="w-[340px]">Vincular WhatsApp</TableHead>
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
                  <TableCell className="text-xs">{formatWhatsapp(user.whatsapp)}</TableCell>
                  <TableCell>{user.reservationsCount}</TableCell>
                  <TableCell>{user.appointmentsCount}</TableCell>
                  <TableCell>{user.paymentsCount}</TableCell>
                  <TableCell>{formatMoney(user.paidAmountCents)}</TableCell>
                  <TableCell>
                    <form action={linkWhatsappToUserAction} className="flex items-center gap-2">
                      <input type="hidden" name="clerkUserId" value={user.clerkUserId} />
                      <Input name="phone" placeholder="(85) 99999-9999 ou 5585999999999" className="h-8 text-xs" />
                      <Button type="submit" size="sm">
                        Vincular
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
