import Link from "next/link";
import { getReservationActionData } from "@/app/dashboard/admin/reservas/_lib/reservation-actions";
import { AdminReservationActionView } from "@/components/admin-reservation-action-view";
import { Button } from "@/components/ui/button";

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>
  | undefined;

function toSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export async function renderAgendaReservationActionPage({
  reservationId,
  mode,
  asDrawer,
  searchParams,
}: {
  reservationId: string;
  mode: "reagendar" | "status" | "cancelar" | "contato";
  asDrawer: boolean;
  searchParams?: SearchParamsInput;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const reservation = await getReservationActionData(reservationId);
  if (!reservation) {
    if (asDrawer) {
      return null;
    }
    return (
      <section className="mx-auto w-full max-w-4xl space-y-4 max-md:max-w-none max-md:px-0">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Reserva não encontrada</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/admin/agenda">Voltar</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <AdminReservationActionView
      mode={mode}
      reservation={reservation}
      asDrawer={asDrawer}
      backHref="/dashboard/admin/agenda"
      initialDate={toSingleValue(resolvedSearchParams.date)}
      initialTime={toSingleValue(resolvedSearchParams.time)}
      fromDragDrop={toSingleValue(resolvedSearchParams.fromDragDrop) === "true"}
    />
  );
}
