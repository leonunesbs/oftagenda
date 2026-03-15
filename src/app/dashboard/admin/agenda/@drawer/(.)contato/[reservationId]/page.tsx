import { renderAgendaReservationActionPage } from "@/app/dashboard/admin/agenda/_lib/render-reservation-action-page";

export default async function AdminAgendaContatoDrawerPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = await params;
  return renderAgendaReservationActionPage({ reservationId, mode: "contato", asDrawer: true });
}
