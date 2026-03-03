import { setReservationStatusAction } from "@/app/dashboard/admin/actions";
import {
  formatDateTime24h,
  getAdminSnapshot,
  selectClassName,
} from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function AdminReservationsPage() {
  const data = await getAdminSnapshot();

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Reservas</CardTitle>
        <CardDescription>Atualize status e observações das reservas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.reservations.map((reservation) => (
          <div key={reservation._id} className="rounded-lg border p-3">
            <p className="font-medium">{reservation.eventTypeTitle}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime24h(reservation.startsAt)} - {reservation.availabilityLabel}
            </p>
            <p className="text-xs text-muted-foreground">Usuário: {reservation.clerkUserId}</p>
            <form action={setReservationStatusAction} className="mt-2 grid gap-2">
              <input type="hidden" name="reservationId" value={reservation._id} />
              <select name="status" className={selectClassName} defaultValue={reservation.status}>
                <option value="pending">pending</option>
                <option value="confirmed">confirmed</option>
                <option value="cancelled">cancelled</option>
                <option value="completed">completed</option>
              </select>
              <Input name="notes" placeholder="Observação opcional" defaultValue={reservation.notes ?? ""} />
              <Button size="sm" type="submit">
                Atualizar reserva
              </Button>
            </form>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
