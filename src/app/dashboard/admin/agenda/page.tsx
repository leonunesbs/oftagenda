import { buildAvailabilityGroups, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { AdminCalendar } from "@/components/admin-calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminAgendaPage() {
  const data = await getAdminSnapshot();
  const userByClerkId = new Map(data.users.map((user) => [user.clerkUserId, user]));
  const availabilityGroups = buildAvailabilityGroups(data).map((group) => ({
    name: group.name,
    representativeId: group.representativeId,
  }));

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
    };
  });

  const eventTypes = data.eventTypes.map((eventType) => ({
    _id: String(eventType._id),
    name: eventType.name,
    title: eventType.title,
    kind: eventType.kind,
    availabilityId: eventType.availabilityId ? String(eventType.availabilityId) : undefined,
    location: eventType.location,
    active: eventType.active,
  }));

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Agenda visual</CardTitle>
        <CardDescription>Grade semanal/diaria para operacao de consultas, exames e procedimentos.</CardDescription>
      </CardHeader>
      <CardContent>
        <AdminCalendar items={items} eventTypes={eventTypes} availabilityGroups={availabilityGroups} />
      </CardContent>
    </Card>
  );
}
