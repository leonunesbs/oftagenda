import { formatDateTime24h, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminScheduleEventsPage() {
  const data = await getAdminSnapshot();

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Eventos da agenda</CardTitle>
        <CardDescription>Últimos eventos operacionais dos agendamentos.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.appointmentEvents.map((event) => (
                <TableRow key={event._id}>
                  <TableCell className="font-medium">{event.eventType}</TableCell>
                  <TableCell>{formatDateTime24h(event.createdAt)}</TableCell>
                  <TableCell className="text-xs">{event.clerkUserId}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{event.notes ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
