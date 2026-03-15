import { getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { AdminCalendar } from "@/components/admin-calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminAgendaPage() {
  const data = await getAdminSnapshot();
  const userByClerkId = new Map(data.users.map((user) => [user.clerkUserId, user]));

  const items = data.reservations.map((reservation) => {
    const matchingEvent = data.eventTypes.find((eventType) => eventType._id === reservation.eventTypeId);
    const user = userByClerkId.get(reservation.clerkUserId);
    return {
      _id: String(reservation._id),
      reservationId: String(reservation._id),
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      status: reservation.status,
      eventTypeTitle: reservation.eventTypeTitle,
      kind: matchingEvent?.kind ?? "consulta",
      clerkUserId: reservation.clerkUserId,
      eventTypeId: String(reservation.eventTypeId),
      availabilityId: String(reservation.availabilityId),
      notes: reservation.notes ?? "",
      patientName: user?.name ?? "Paciente sem nome",
      patientEmail: user?.email ?? "",
      patientPhone: user?.phone ?? "",
      patientBirthDate: user?.birthDate ?? "",
    };
  });

  const now = Date.now();
  const pendingPayment = items.filter((item) => item.status === "pending").length;
  const calendarItems = items.filter((item) => item.status === "confirmed" || item.status === "pending");
  const upcomingToday = calendarItems.filter((item) => {
    const date = new Date(item.startsAt);
    const currentDate = new Date(now);
    return (
      date.getFullYear() === currentDate.getFullYear() &&
      date.getMonth() === currentDate.getMonth() &&
      date.getDate() === currentDate.getDate()
    );
  }).length;
  const activeByEmail = calendarItems.filter((item) => item.patientEmail).length;
  const recentOperations = data.appointmentEvents.slice(0, 8);

  return (
    <div className="space-y-4">
      <Card variant="flat-mobile" className="min-w-0 border-border/70">
        <CardHeader className="space-y-2">
          <CardTitle>Central da agenda</CardTitle>
          <CardDescription>
            Operação diária da secretária em uma única tela: calendário, contato, reagendamento, cancelamento e
            lembretes por e-mail.
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{upcomingToday} atendimentos hoje</Badge>
            <Badge variant="outline">{pendingPayment} aguardando pagamento</Badge>
            <Badge variant="outline">{activeByEmail} com e-mail para lembrete</Badge>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          <AdminCalendar items={calendarItems} />
        </CardContent>
      </Card>

      <Card variant="flat-mobile" className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">Últimos registros da operação</CardTitle>
          <CardDescription>Histórico recente para consulta rápida sem sair da agenda.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {recentOperations.length > 0 ? (
            recentOperations.map((event) => (
              <div key={String(event._id)} className="rounded-md border p-2 text-sm">
                <p className="font-medium">{event.eventType}</p>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                    hour12: false,
                  }).format(new Date(event.createdAt))}
                </p>
                <p className="text-xs text-muted-foreground">{event.notes ?? "Sem observações."}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Ainda não há registros recentes.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
