import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { api } from "../../../convex/_generated/api";
import { getUserRoleFromClerkAuth, hasConfirmedBooking } from "@/lib/access";
import { PatientPanelForm } from "@/components/patient-panel-form";
import { Button } from "@/components/ui/button";
import { BookingConfirmedEvent } from "@/components/booking-confirmed-event";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

export default async function DashboardPage() {
  const authData = await auth();
  const role = await getUserRoleFromClerkAuth(authData);
  const isAdmin = role === "admin";

  let dashboardState: {
    hasConfirmedBooking: boolean;
    nextAppointment: {
      _id: string;
      scheduledFor?: number;
      location: string;
      consultationType?: string;
      status: string;
    } | null;
    pendingReservations: Array<{
      _id: string;
      startsAt: number;
      holdExpiresAt: number;
      location: string;
      consultationType: string;
    }>;
    history: Array<{ _id: string; status: string; requestedAt: number; location: string }>;
  } = {
    hasConfirmedBooking: false,
    nextAppointment: null,
    pendingReservations: [],
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
            status: data.nextAppointment.status,
          }
        : null,
      pendingReservations: data.pendingReservations.map((item) => ({
        _id: item._id,
        startsAt: item.startsAt,
        holdExpiresAt: item.holdExpiresAt,
        location: item.location,
        consultationType: item.consultationType,
      })),
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
  const initialPanelData = {
    location: nextAppointment?.location ?? "",
    date: nextAppointment?.scheduledFor
      ? new Date(nextAppointment.scheduledFor).toISOString().slice(0, 10)
      : "",
    time: nextAppointment?.scheduledFor
      ? new Date(nextAppointment.scheduledFor).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "",
    consultationType: nextAppointment?.consultationType ?? "Consulta oftalmologica",
    status: nextAppointment?.status ?? "pending",
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6">
      <BookingConfirmedEvent enabled={bookingConfirmed} />
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Status do agendamento</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Você está em modo administrador. Use o atalho abaixo para gestão."
              : "Fluxo pensado para ser rápido e sem atrito."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isAdmin ? (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <h3 className="font-medium">Acesso administrativo</h3>
              <p className="text-sm text-muted-foreground">
                Sua conta possui <code>publicMetadata.role = "admin"</code>.
              </p>
              <Button variant="secondary" asChild>
                <Link href="/dashboard/admin">Abrir painel admin</Link>
              </Button>
            </div>
          ) : null}

          {bookingConfirmed ? (
            <PatientPanelForm initialAppointment={initialPanelData} />
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
              <Link
                href="https://wa.me/5585999853811?text=Ol%C3%A1!%20Vim%20pela%20Minha%20Agenda%20e%20gostaria%20de%20confirmar/reagendar%20minha%20consulta."
                target="_blank"
                rel="noreferrer"
              >
                Confirmar/reagendar no WhatsApp
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              A decisão final sobre dilatação é feita durante a consulta.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="font-medium">Agendamentos pendentes</h3>
            {dashboardState.pendingReservations.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {dashboardState.pendingReservations.map((item) => (
                  <li key={item._id}>
                    {item.consultationType} - {item.location} -{" "}
                    {new Date(item.startsAt).toLocaleString("pt-BR")} (reservado ate{" "}
                    {new Date(item.holdExpiresAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    )
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum agendamento pendente de pagamento no momento.
              </p>
            )}
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
