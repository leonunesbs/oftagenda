import {
  buildAvailabilityGroups,
  getAdminSnapshot,
} from "@/app/dashboard/admin/_lib/admin-dashboard";
import { AdminReservationsManager } from "@/components/admin-reservations-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const statusFilters = ["all", "pending", "confirmed", "completed", "cancelled"] as const;

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string | string[];
    q?: string | string[];
  }>;
}) {
  const data = await getAdminSnapshot();
  const params = await searchParams;
  const rawStatus = Array.isArray(params?.status) ? params.status[0] : params?.status;
  const rawSearchQuery = Array.isArray(params?.q) ? params.q[0] : params?.q;
  const selectedStatus = statusFilters.includes((rawStatus as (typeof statusFilters)[number]) ?? "all")
    ? ((rawStatus as (typeof statusFilters)[number]) ?? "all")
    : "all";
  const searchQuery = (rawSearchQuery ?? "").trim().toLowerCase();
  const eventKindById = new Map(
    data.eventTypes.map((eventType) => [String(eventType._id), eventType.kind ?? "consulta"]),
  );
  const usersByClerkId = new Map(data.users.map((user) => [user.clerkUserId, user]));
  const availabilityGroups = buildAvailabilityGroups(data).map((group) => ({
    name: group.name,
    representativeId: group.representativeId,
  }));
  const allReservations = data.reservations.map((reservation) => {
    const user = usersByClerkId.get(reservation.clerkUserId);
    return {
      ...reservation,
      _id: String(reservation._id),
      eventTypeId: String(reservation.eventTypeId),
      availabilityId: String(reservation.availabilityId),
      kind: eventKindById.get(String(reservation.eventTypeId)) ?? "consulta",
      patientName: user?.name,
      patientEmail: user?.email,
      patientPhone: user?.phone,
    };
  });
  const reservations = allReservations.filter((reservation) => {
    if (selectedStatus !== "all" && reservation.status !== selectedStatus) {
      return false;
    }
    if (!searchQuery) {
      return true;
    }
    const searchableContent = [
      reservation.patientName ?? "",
      reservation.patientEmail ?? "",
      reservation.patientPhone ?? "",
      reservation.clerkUserId,
      reservation.eventTypeTitle,
      reservation.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return searchableContent.includes(searchQuery);
  });
  const stats = {
    total: reservations.length,
    pending: reservations.filter((reservation) => reservation.status === "pending").length,
    confirmed: reservations.filter((reservation) => reservation.status === "confirmed").length,
    cancelled: reservations.filter((reservation) => reservation.status === "cancelled").length,
  };

  return (
    <Card variant="flat-mobile" className="border-border/70">
      <CardHeader>
        <CardTitle>Reservas e agenda operacional</CardTitle>
        <CardDescription>
          Gestão completa de marcações com cadastro assistido, reagendamento, cancelamento e comunicação com paciente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminReservationsManager
          reservations={reservations}
          eventTypes={data.eventTypes.map((eventType) => ({
            _id: String(eventType._id),
            name: eventType.name,
            title: eventType.title,
            kind: eventType.kind,
            availabilityId: eventType.availabilityId ? String(eventType.availabilityId) : undefined,
            location: eventType.location,
            active: eventType.active,
          }))}
          availabilityGroups={availabilityGroups}
          selectedStatus={selectedStatus}
          searchQuery={rawSearchQuery ?? ""}
          stats={stats}
        />
      </CardContent>
    </Card>
  );
}
