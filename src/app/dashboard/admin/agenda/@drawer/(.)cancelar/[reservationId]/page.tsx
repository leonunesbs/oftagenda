import { renderAgendaReservationActionPage } from "@/app/dashboard/admin/agenda/_lib/render-reservation-action-page";

export default async function AdminAgendaCancelarDrawerPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = await params;
  return renderAgendaReservationActionPage({ reservationId, mode: "cancelar", asDrawer: true });
}
