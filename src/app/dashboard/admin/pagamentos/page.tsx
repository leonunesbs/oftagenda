import { createPaymentAction, setPaymentStatusAction } from "@/app/dashboard/admin/actions";
import { formatMoney, getAdminSnapshot, selectClassName } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminPaymentsPage() {
  const data = await getAdminSnapshot();

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Pagamentos</CardTitle>
        <CardDescription>Registrar e atualizar pagamentos vinculados a reservas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Dialog>
          <DialogTrigger asChild>
            <Button>Registrar pagamento</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Novo pagamento</DialogTitle>
              <DialogDescription>Cadastre um pagamento no sistema.</DialogDescription>
            </DialogHeader>
            <form action={createPaymentAction} className="grid gap-2 rounded-lg border p-3">
              <Label htmlFor="payment-reservationId">ID da reserva (opcional)</Label>
              <Input id="payment-reservationId" name="reservationId" placeholder="ex: j57..." />
              <Label htmlFor="payment-clerkUserId">ID de usuário Clerk (se não houver reserva)</Label>
              <Input id="payment-clerkUserId" name="clerkUserId" placeholder="user_..." />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Valor (centavos)</Label>
                  <Input id="payment-amount" name="amountCents" type="number" min={1} defaultValue={10000} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-currency">Moeda</Label>
                  <Input id="payment-currency" name="currency" defaultValue="BRL" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select name="method" className={selectClassName} defaultValue="pix">
                  <option value="pix">pix</option>
                  <option value="card">card</option>
                  <option value="cash">cash</option>
                  <option value="transfer">transfer</option>
                </select>
                <select name="status" className={selectClassName} defaultValue="pending">
                  <option value="pending">pending</option>
                  <option value="paid">paid</option>
                  <option value="refunded">refunded</option>
                  <option value="failed">failed</option>
                </select>
              </div>
              <Input name="externalId" placeholder="ID externo opcional" />
              <Input name="notes" placeholder="Observação opcional" />
              <Button type="submit">Salvar pagamento</Button>
            </form>
          </DialogContent>
        </Dialog>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Status atual</TableHead>
                <TableHead className="w-[280px]">Atualizar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.payments.map((payment) => (
                <TableRow key={payment._id}>
                  <TableCell className="font-medium">{formatMoney(payment.amountCents, payment.currency)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {payment.method} / {payment.currency}
                  </TableCell>
                  <TableCell className="text-xs">{payment.clerkUserId}</TableCell>
                  <TableCell>
                    <Badge variant={payment.status === "paid" ? "default" : "outline"}>{payment.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <form action={setPaymentStatusAction} className="grid gap-2">
                      <input type="hidden" name="paymentId" value={payment._id} />
                      <select name="status" className={selectClassName} defaultValue={payment.status}>
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="refunded">refunded</option>
                        <option value="failed">failed</option>
                      </select>
                      <Input name="notes" defaultValue={payment.notes ?? ""} placeholder="Observação" />
                      <Button size="sm" type="submit">
                        Atualizar
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
