import Link from "next/link";

import { api } from "../../../convex/_generated/api";
import { hasConfirmedBooking } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

export default async function DashboardPage() {
  let dashboardState: {
    hasConfirmedBooking: boolean;
    nextAppointment: {
      _id: string;
      scheduledFor?: number;
      location: string;
      consultationType?: string;
    } | null;
    history: Array<{ _id: string; status: string; requestedAt: number; location: string }>;
  } = {
    hasConfirmedBooking: false,
    nextAppointment: null,
    history: [],
  };

  try {
    const { client } = await getAuthenticatedConvexHttpClient();
    const data = await client.query(api.appointments.getDashboardState, {});
    dashboardState = {
      hasConfirmedBooking: data.hasConfirmedBooking,
      nextAppointment: data.nextAppointment
        ? {
            _id: data.nextAppointment._id,
            scheduledFor: data.nextAppointment.scheduledFor,
            location: data.nextAppointment.location,
            consultationType: data.nextAppointment.consultationType,
          }
        : null,
      history: data.history.map((item) => ({
        _id: item._id,
        status: item.status,
        requestedAt: item.requestedAt,
        location: item.location,
      })),
    };
  } catch {
    dashboardState.hasConfirmedBooking = await hasConfirmedBooking();
  }

  const bookingConfirmed = dashboardState.hasConfirmedBooking;
  const nextAppointment = dashboardState.nextAppointment;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Status do agendamento</CardTitle>
          <CardDescription>Fluxo pensado para ser rápido e sem atrito.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {bookingConfirmed ? (
            <div className="space-y-4 rounded-xl border border-border p-4">
              <h3 className="font-medium">Próxima consulta</h3>
              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                <p>Data: {nextAppointment?.scheduledFor ? new Date(nextAppointment.scheduledFor).toLocaleDateString("pt-BR") : "A confirmar"}</p>
                <p>Horário: {nextAppointment?.scheduledFor ? new Date(nextAppointment.scheduledFor).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "A confirmar"}</p>
                <p>Local: {nextAppointment?.location ?? "A confirmar"}</p>
                <p>Tipo: {nextAppointment?.consultationType ?? "Consulta oftalmológica"}</p>
              </div>
              <Button asChild>
                <Link href="/detalhes">Adicionar detalhes (opcional)</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-border p-4">
              <h3 className="font-medium">Agendar consulta</h3>
              <p className="text-sm text-muted-foreground">
                Você ainda não possui agendamento confirmado.
              </p>
              <Button asChild>
                <Link href="/agendar">Ir para agendamento</Link>
              </Button>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <Button variant="secondary" asChild>
              <a
                href="https://wa.me/5585996212996?text=Ol%C3%A1!%20Vim%20pela%20Minha%20Agenda%20e%20gostaria%20de%20confirmar/reagendar%20minha%20consulta."
                target="_blank"
                rel="noreferrer"
              >
                Confirmar/reagendar no WhatsApp
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              A decisão final sobre dilatação é feita durante a consulta.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-medium">Histórico e programação</h3>
            {dashboardState.history.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {dashboardState.history.map((item) => (
                  <li key={item._id}>
                    {item.status} - {new Date(item.requestedAt).toLocaleString("pt-BR")} - {item.location}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Sem histórico de agendamentos ainda.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
