import { formatDateTime24h, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";

const periodFilters = ["7d", "30d", "all"] as const;

export default async function AdminScheduleEventsPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; type?: string }>;
}) {
  const data = await getAdminSnapshot();
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedPeriod = periodFilters.includes((resolvedSearchParams.period as (typeof periodFilters)[number]) ?? "7d")
    ? ((resolvedSearchParams.period as (typeof periodFilters)[number]) ?? "7d")
    : "7d";
  const selectedType = resolvedSearchParams.type?.trim() || "all";

  const now = Date.now();
  const periodStart =
    selectedPeriod === "7d"
      ? now - 7 * 24 * 60 * 60_000
      : selectedPeriod === "30d"
        ? now - 30 * 24 * 60 * 60_000
        : Number.MIN_SAFE_INTEGER;

  const eventTypes = [...new Set(data.appointmentEvents.map((event) => event.eventType))];
  const filteredEvents = data.appointmentEvents.filter((event) => {
    if (event.createdAt < periodStart) {
      return false;
    }
    if (selectedType === "all") {
      return true;
    }
    return event.eventType === selectedType;
  });

  return (
    <Card variant="flat-mobile" className="border-border/70">
      <CardHeader>
        <CardTitle>Eventos da agenda</CardTitle>
        <CardDescription>Monitore mudanças operacionais por tipo e janela de tempo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {periodFilters.map((period) => (
            <Button key={period} variant={selectedPeriod === period ? "default" : "outline"} size="sm" asChild>
              <Link href={`/dashboard/admin/agenda-eventos?period=${period}&type=${selectedType}`}>
                {period === "all" ? "todo período" : period}
              </Link>
            </Button>
          ))}
          <Button variant={selectedType === "all" ? "default" : "outline"} size="sm" asChild>
            <Link href={`/dashboard/admin/agenda-eventos?period=${selectedPeriod}&type=all`}>todos tipos</Link>
          </Button>
          {eventTypes.map((eventType) => (
            <Button key={eventType} variant={selectedType === eventType ? "default" : "outline"} size="sm" asChild>
              <Link href={`/dashboard/admin/agenda-eventos?period=${selectedPeriod}&type=${eventType}`}>{eventType}</Link>
            </Button>
          ))}
        </div>
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
              {filteredEvents.map((event) => (
                <TableRow key={event._id}>
                  <TableCell className="font-medium">
                    <Badge variant="outline">{event.eventType}</Badge>
                  </TableCell>
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
