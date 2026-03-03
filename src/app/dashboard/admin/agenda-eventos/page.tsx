import { formatDateTime24h, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminScheduleEventsPage() {
  const data = await getAdminSnapshot();

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Eventos da agenda</CardTitle>
        <CardDescription>Últimos eventos operacionais dos agendamentos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.appointmentEvents.map((event) => (
          <div key={event._id} className="rounded-lg border p-3">
            <p className="font-medium">{event.eventType}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime24h(event.createdAt)}</p>
            <p className="text-xs text-muted-foreground">usuário: {event.clerkUserId}</p>
            {event.notes ? <p className="text-xs text-muted-foreground">{event.notes}</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
