import { setReservationStatusAction } from "@/app/dashboard/admin/actions";
import {
  formatDateTime24h,
  getAdminSnapshot,
  selectClassName,
} from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";

const statusFilters = ["all", "pending", "confirmed", "completed", "cancelled"] as const;

const kindClassName: Record<"consulta" | "exame" | "procedimento", string> = {
  consulta: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  exame: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  procedimento: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
};

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const data = await getAdminSnapshot();
  const selectedStatus = statusFilters.includes((searchParams?.status as (typeof statusFilters)[number]) ?? "all")
    ? ((searchParams?.status as (typeof statusFilters)[number]) ?? "all")
    : "all";
  const eventKindById = new Map(
    data.eventTypes.map((eventType) => [String(eventType._id), eventType.kind ?? "consulta"]),
  );
  const reservations = data.reservations.filter((reservation) =>
    selectedStatus === "all" ? true : reservation.status === selectedStatus,
  );

  return (
    <Card variant="flat-mobile" className="border-border/70">
      <CardHeader>
        <CardTitle>Reservas</CardTitle>
        <CardDescription>Atualize status, filtre por etapa e acompanhe o tipo de atendimento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((status) => (
            <Button key={status} variant={selectedStatus === status ? "default" : "outline"} size="sm" asChild>
              <Link href={status === "all" ? "/dashboard/admin/reservas" : `/dashboard/admin/reservas?status=${status}`}>
                {status === "all" ? "todos" : status}
              </Link>
            </Button>
          ))}
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observação</TableHead>
                <TableHead className="w-[160px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.map((reservation) => (
                <TableRow key={reservation._id}>
                  <TableCell className="font-medium">{reservation.eventTypeTitle}</TableCell>
                  <TableCell>
                    <Badge className={kindClassName[eventKindById.get(String(reservation.eventTypeId)) ?? "consulta"]}>
                      {eventKindById.get(String(reservation.eventTypeId)) ?? "consulta"}
                    </Badge>
                  </TableCell>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" type="button">
                            Atualizar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar atualização?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação vai alterar o status da reserva e pode impactar o histórico do agendamento.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction type="submit">Confirmar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
