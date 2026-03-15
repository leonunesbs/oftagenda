import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { BookingConfirmedEvent } from "@/components/booking-confirmed-event";
import { CheckoutReturnUrlCleaner } from "@/components/checkout-return-url-cleaner";
import { PendingReservationsList } from "@/components/pending-reservations-list";
import { PhoneLinkCard } from "@/components/phone-link-card";
import { RescheduleAppointmentCard } from "@/components/reschedule-appointment-card";
import { upsertPatientBirthDateAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBookingBootstrapData } from "@/lib/booking-bootstrap";
import { getUserRoleFromClerkAuth, hasConfirmedBooking } from "@/lib/access";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";
import { api } from "@convex/_generated/api";

type DashboardPageProps = {
  searchParams?:
    | Promise<{
        payment?: string;
      }>
    | {
        payment?: string;
      };
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = (await searchParams) ?? {};
  const payment = params.payment ?? "";
  const paymentJustSucceeded = payment === "success";
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
      checkoutLocation: string;
      checkoutDate: string;
      checkoutTime: string;
    }>;
    reschedulePolicy: {
      canReschedule: boolean;
      canCancel: boolean;
      cancelReason: string | null;
      requiresHumanSupport: boolean;
      reason: string | null;
      maxReschedules: number;
      reschedulesUsed: number;
      minNoticeHours: number;
      maxDaysAhead: number;
    };
    history: Array<{
      _id: string;
      status: string;
      requestedAt: number;
      location: string;
    }>;
  } = {
    hasConfirmedBooking: false,
    nextAppointment: null,
    pendingReservations: [],
    reschedulePolicy: {
      canReschedule: false,
      canCancel: false,
      cancelReason: "Nenhuma consulta ativa encontrada.",
      requiresHumanSupport: false,
      reason: "Nenhuma consulta ativa encontrada.",
      maxReschedules: 1,
      reschedulesUsed: 0,
      minNoticeHours: 24,
      maxDaysAhead: 30,
    },
    history: [],
  };
  let phoneLinkStatus: { linked: boolean; phone?: string } = { linked: false };
  let patientBirthDate = "";
  let rematchBootstrap: Awaited<ReturnType<typeof getBookingBootstrapData>> = {
    locations: [],
    locationsError: null,
    availabilityByLocation: {},
    availabilityErrorsByLocation: {},
  };

  try {
    const { client } = await getAuthenticatedConvexHttpClient();
    const phoneLinkResult = await client.query(api.phoneLinks.getPhoneLinkByClerkUser, {
      clerkUserId: authData.userId!,
    });
    if (phoneLinkResult) {
      const masked = phoneLinkResult.phone.length > 4
        ? `${"*".repeat(phoneLinkResult.phone.length - 4)}${phoneLinkResult.phone.slice(-4)}`
        : phoneLinkResult.phone;
      phoneLinkStatus = { linked: true, phone: masked };
    }
    const patient = await client.query(api.patients.getCurrentPatient, {});
    patientBirthDate = patient?.birthDate ?? "";
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
        checkoutLocation: item.checkoutLocation,
        checkoutDate: item.checkoutDate,
        checkoutTime: item.checkoutTime,
      })),
      reschedulePolicy: {
        canReschedule: data.reschedulePolicy.canReschedule,
        canCancel: data.reschedulePolicy.canCancel,
        cancelReason: data.reschedulePolicy.cancelReason,
        requiresHumanSupport: data.reschedulePolicy.requiresHumanSupport,
        reason: data.reschedulePolicy.reason,
        maxReschedules: data.reschedulePolicy.maxReschedules,
        reschedulesUsed: data.reschedulePolicy.reschedulesUsed,
        minNoticeHours: data.reschedulePolicy.minNoticeHours,
        maxDaysAhead: data.reschedulePolicy.maxDaysAhead,
      },
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

  rematchBootstrap = await getBookingBootstrapData({ daysAhead: 30 });

  const bookingConfirmed = dashboardState.hasConfirmedBooking;
  const hasPendingReschedule = dashboardState.pendingReservations.length > 0;
  const nextAppointment = dashboardState.nextAppointment;
  const latestNoShow =
    !bookingConfirmed && dashboardState.history[0]?.status === "no_show";
  const appointmentStart = resolveAppointmentStart(nextAppointment?.scheduledFor);
  const appointmentLocation = nextAppointment?.location || "Local a confirmar";
  const calendarLinks = appointmentStart
    ? buildCalendarLinks({
        title: "Consulta com Dr Leonardo",
        description:
          "Sua consulta está confirmada. Se precisar, entre em contato pelo WhatsApp para confirmar ou reagendar.",
        location: appointmentLocation,
        startsAt: appointmentStart,
        durationMinutes: 60,
      })
    : null;
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
    consultationType:
      nextAppointment?.consultationType ?? "Consulta oftalmológica",
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 max-md:-mx-4 max-md:max-w-none max-md:px-4">
      <BookingConfirmedEvent enabled={bookingConfirmed} />
      <CheckoutReturnUrlCleaner enabled={paymentJustSucceeded} />
      <Card variant="flat-mobile" className="border-border/70">
        <CardHeader>
          <CardTitle>Minha agenda</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Você está em modo administrador. Use o atalho abaixo para gestão."
              : "Resumo rápido da sua consulta e ações principais."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {paymentJustSucceeded ? (
            <div className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
              <h3 className="font-medium text-emerald-900 dark:text-emerald-200">
                Pagamento confirmado! Seja muito bem-vindo(a).
              </h3>
              <p className="text-sm text-emerald-800/90 dark:text-emerald-200/90">
                Sua consulta foi reservada com sucesso.
              </p>
              {calendarLinks ? (
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link
                      href={calendarLinks.googleCalendarHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Salvar no Google Agenda
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={calendarLinks.icsHref}
                      download="consulta-dr-leonardo.ics"
                    >
                      Salvar no calendário do celular
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                  Assim que os dados da consulta estiverem disponíveis, você
                  poderá salvar no calendário.
                </p>
              )}
            </div>
          ) : null}

          {isAdmin ? (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <h3 className="font-medium">Acesso administrativo</h3>
              <Button variant="secondary" asChild>
                <Link href="/dashboard/admin">Abrir painel admin</Link>
              </Button>
            </div>
          ) : null}

          {latestNoShow ? (
            <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <h3 className="font-medium text-amber-900 dark:text-amber-200">
                Consulta marcada como no-show
              </h3>
              <p className="text-sm text-amber-900/90 dark:text-amber-200/90">
                O horário de início já passou, então este agendamento foi encerrado automaticamente.
                Você já pode criar uma nova reserva conforme regulamento.
              </p>
            </div>
          ) : null}

          {bookingConfirmed && nextAppointment ? (
            <div className="space-y-4 rounded-xl border border-border p-4">
              <h3 className="font-medium">Próxima consulta</h3>
              <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
                <p>
                  <span className="font-medium text-foreground">Local:</span>{" "}
                  {initialPanelData.location || "A confirmar"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Tipo:</span>{" "}
                  {initialPanelData.consultationType}
                </p>
                <p>
                  <span className="font-medium text-foreground">Data:</span>{" "}
                  {initialPanelData.date || "A confirmar"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Horário:</span>{" "}
                  {initialPanelData.time || "A confirmar"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" asChild>
                  <Link href="/detalhes">Preencher detalhes opcionais</Link>
                </Button>
                {calendarLinks ? (
                  <Button asChild>
                    <Link
                      href={calendarLinks.googleCalendarHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Salvar no Google Agenda
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : hasPendingReschedule ? (
            <div className="space-y-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
              <h3 className="font-medium">Agendamento aguardando remarcação</h3>
              <p className="text-sm text-muted-foreground">
                Você já possui agendamento pendente. Enquanto ele estiver ativo,
                não é possível criar um novo agendamento.
              </p>
              <Button asChild variant="outline">
                <Link href="#agendamentos-pendentes">Ver pendentes</Link>
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

          {bookingConfirmed ? (
            <RescheduleAppointmentCard
              policy={dashboardState.reschedulePolicy}
              locations={rematchBootstrap.locations}
              availabilityByLocation={rematchBootstrap.availabilityByLocation}
              availabilityErrorsByLocation={rematchBootstrap.availabilityErrorsByLocation}
              initialLocation={nextAppointment?.location}
            />
          ) : null}

          <PhoneLinkCard linked={phoneLinkStatus.linked} maskedPhone={phoneLinkStatus.phone} />

          <div className="space-y-3 rounded-xl border border-border p-4">
            <h3 className="font-medium">Dados pessoais</h3>
            <p className="text-sm text-muted-foreground">
              Informe sua data de nascimento para facilitar conferência de cadastro e comunicação com a clínica.
            </p>
            <form action={upsertPatientBirthDateAction} className="grid gap-3 sm:max-w-xs">
              <Label htmlFor="birthDate">Data de nascimento</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                defaultValue={patientBirthDate}
                max={new Date().toISOString().slice(0, 10)}
              />
              <Button type="submit" variant="outline">
                Salvar data de nascimento
              </Button>
            </form>
          </div>

          <div className="space-y-3">
            <Button variant="secondary" asChild>
              <Link
                href="https://wa.me/5585999853811?text=Ol%C3%A1!%20Vim%20pela%20Minha%20Agenda%20e%20gostaria%20de%20confirmar/reagendar%20minha%20consulta."
                target="_blank"
                rel="noreferrer"
              >
                Falar no WhatsApp
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Em caso de urgência ou regra não atendida, o suporte humano continua disponível.
            </p>
          </div>

          <div id="agendamentos-pendentes" className="space-y-2">
            <h3 className="font-medium">Agendamentos pendentes</h3>
            <PendingReservationsList
              reservations={dashboardState.pendingReservations}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function resolveAppointmentStart(nextAppointmentTimestamp?: number) {
  if (typeof nextAppointmentTimestamp === "number") {
    return new Date(nextAppointmentTimestamp);
  }
  return null;
}

function buildCalendarLinks({
  title,
  description,
  location,
  startsAt,
  durationMinutes,
}: {
  title: string;
  description: string;
  location: string;
  startsAt: Date;
  durationMinutes: number;
}) {
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);
  const startCalendar = formatCalendarDate(startsAt);
  const endCalendar = formatCalendarDate(endsAt);
  const googleParams = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: description,
    location,
    dates: `${startCalendar}/${endCalendar}`,
  });

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//oftagenda//Booking Calendar//PT-BR",
    "BEGIN:VEVENT",
    `UID:${createIcsUid(startsAt)}@oftagenda`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${startCalendar}`,
    `DTEND:${endCalendar}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return {
    googleCalendarHref: `https://calendar.google.com/calendar/render?${googleParams.toString()}`,
    icsHref: `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`,
  };
}

function formatCalendarDate(date: Date) {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}${second}`;
}

function createIcsUid(startsAt: Date) {
  return `consulta-${startsAt.getTime()}`;
}

function escapeIcsText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}
