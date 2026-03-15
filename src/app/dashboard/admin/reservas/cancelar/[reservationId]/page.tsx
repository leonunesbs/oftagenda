import Link from "next/link";
import { getReservationActionData } from "@/app/dashboard/admin/reservas/_lib/reservation-actions";
import { AdminReservationActionView } from "@/components/admin-reservation-action-view";
import { Button } from "@/components/ui/button";

export default async function AdminReservasCancelarPage({
  params,
}: {
  params: Promise<{ reservationId: string }>;
}) {
  const { reservationId } = await params;
  const reservation = await getReservationActionData(reservationId);

  if (!reservation) {
    return (
      <section className="mx-auto w-full max-w-4xl space-y-4 max-md:max-w-none max-md:px-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Reserva não encontrada</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/admin/reservas">Voltar</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <AdminReservationActionView
      mode="cancelar"
      reservation={reservation}
      asDrawer={false}
      backHref="/dashboard/admin/reservas"
    />
  );
}
