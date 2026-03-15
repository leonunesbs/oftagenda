import { renderCreateAppointmentPage } from "@/app/dashboard/admin/agenda/_lib/render-create-appointment-page";

export default async function AdminAgendaNovoAgendamentoPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderCreateAppointmentPage({ asDrawer: false, searchParams });
}
