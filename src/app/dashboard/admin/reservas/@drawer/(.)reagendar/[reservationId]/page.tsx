import { getReservationActionData } from "@/app/dashboard/admin/reservas/_lib/reservation-actions";
import { AdminReservationActionView } from "@/components/admin-reservation-action-view";

export default async function AdminReservasReagendarDrawerPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = await params;
  const reservation = await getReservationActionData(reservationId);
  if (!reservation) {
    return null;
  }
  return (
    <AdminReservationActionView
      mode="reagendar"
      reservation={reservation}
      asDrawer
      backHref="/dashboard/admin/reservas"
    />
  );
}
