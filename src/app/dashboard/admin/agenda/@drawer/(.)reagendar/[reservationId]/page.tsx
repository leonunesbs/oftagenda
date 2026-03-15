import { renderAgendaReservationActionPage } from "@/app/dashboard/admin/agenda/_lib/render-reservation-action-page";

export default async function AdminAgendaReagendarDrawerPage({
  params,
  searchParams,
}: {
  params: Promise<{ reservationId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { reservationId } = await params;
  return renderAgendaReservationActionPage({ reservationId, mode: "reagendar", asDrawer: true, searchParams });
}
