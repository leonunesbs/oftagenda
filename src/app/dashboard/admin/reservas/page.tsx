import { setReservationStatusAction } from "@/app/dashboard/admin/actions";
import {
  formatDateTime24h,
  getAdminSnapshot,
  selectClassName,
} from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminReservationsPage() {
  const data = await getAdminSnapshot();

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Reservas</CardTitle>
        <CardDescription>Atualize status e observações das reservas.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className="w-[160px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.reservations.map((reservation) => (
                <TableRow key={reservation._id}>
                  <TableCell className="font-medium">{reservation.eventTypeTitle}</TableCell>
                  <TableCell>
                    {formatDateTime24h(reservation.startsAt)}
                    <p className="text-xs text-muted-foreground">{reservation.availabilityLabel}</p>
                  </TableCell>
                  <TableCell className="text-xs">{reservation.clerkUserId}</TableCell>
                  <TableCell>{reservation.status}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                    {reservation.notes ?? "-"}
                  </TableCell>
                  <TableCell>
                    <form action={setReservationStatusAction} className="grid gap-2">
                      <input type="hidden" name="reservationId" value={reservation._id} />
                      <select name="status" className={selectClassName} defaultValue={reservation.status}>
                        <option value="pending">pending</option>
                        <option value="confirmed">confirmed</option>
                        <option value="cancelled">cancelled</option>
                        <option value="completed">completed</option>
                      </select>
                      <Input name="notes" placeholder="Observação opcional" defaultValue={reservation.notes ?? ""} />
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
