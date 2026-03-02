import { api } from "../../../../convex/_generated/api";
import {
  createAvailabilityAction,
  createEventTypeAction,
  createPaymentAction,
  setAvailabilityStatusAction,
  setEventTypeActiveAction,
  setPaymentStatusAction,
  setReservationStatusAction,
} from "@/app/dashboard/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

const locationLabels: Record<string, string> = {
  fortaleza: "Fortaleza",
  sao_domingos_do_maranhao: "São Domingos do Maranhão",
  fortuna: "Fortuna",
};

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function formatMoney(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default async function AdminDashboardPage() {
  const { client } = await getAuthenticatedConvexHttpClient();
  const data = await client.query(api.admin.getManagementSnapshot, {});

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Painel administrativo</CardTitle>
          <CardDescription>
            Ferramentas de operação conectadas ao Convex e protegidas por Clerk.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
            <p>Eventos: {data.metrics.events}</p>
            <p>Disponibilidades: {data.metrics.availabilities}</p>
            <p>Reservas: {data.metrics.reservations}</p>
            <p>Pacientes: {data.metrics.patients}</p>
            <p>Usuários ativos: {data.metrics.users}</p>
            <p>Pagamentos: {data.metrics.payments}</p>
            <p>Pagos: {data.metrics.paidPayments}</p>
            <p>Receita: {formatMoney(data.metrics.paidRevenueCents)}</p>
            <p>Eventos de agenda: {data.metrics.appointmentEvents}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Eventos</CardTitle>
            <CardDescription>Crie eventos de atendimento e ative/inative rapidamente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createEventTypeAction} className="grid gap-2 rounded-lg border p-3">
              <Label htmlFor="event-slug">Slug</Label>
              <Input id="event-slug" name="slug" required placeholder="consulta-oftalmológica" />
              <Label htmlFor="event-title">Título</Label>
              <Input id="event-title" name="title" required placeholder="Consulta oftalmológica" />
              <Label htmlFor="event-description">Descrição</Label>
              <Textarea id="event-description" name="description" placeholder="Descrição opcional" />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="event-duration">Duração (min)</Label>
                  <Input id="event-duration" name="durationMinutes" type="number" min={5} defaultValue={30} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-location">Local</Label>
                  <select
                    id="event-location"
                    name="location"
                    className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
                    defaultValue="fortaleza"
                  >
                    <option value="fortaleza">Fortaleza</option>
                    <option value="sao_domingos_do_maranhao">São Domingos do Maranhão</option>
                    <option value="fortuna">Fortuna</option>
                  </select>
                </div>
              </div>
              <Button type="submit">Criar evento</Button>
            </form>

            <div className="space-y-2">
              {data.eventTypes.map((eventType) => (
                <div key={eventType._id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{eventType.title}</p>
                    <Badge variant={eventType.active ? "default" : "outline"}>
                      {eventType.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {eventType.slug} - {locationLabels[eventType.location]} - {eventType.durationMinutes} min
                  </p>
                  <form action={setEventTypeActiveAction} className="mt-2 flex items-center gap-2">
                    <input type="hidden" name="eventTypeId" value={eventType._id} />
                    <input type="hidden" name="active" value={String(!eventType.active)} />
                    <Button variant="secondary" size="sm" type="submit">
                      {eventType.active ? "Inativar" : "Ativar"}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Disponibilidade</CardTitle>
            <CardDescription>Controle os horários por tipo de evento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createAvailabilityAction} className="grid gap-2 rounded-lg border p-3">
              <Label htmlFor="availability-event">Evento</Label>
              <select
                id="availability-event"
                name="eventTypeId"
                className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
                required
                defaultValue={data.eventTypes[0]?._id ?? ""}
              >
                {data.eventTypes.map((eventType) => (
                  <option key={eventType._id} value={eventType._id}>
                    {eventType.title}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="availability-weekday">Dia (0-6)</Label>
                  <Input id="availability-weekday" name="weekday" type="number" min={0} max={6} defaultValue={1} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability-start">Início</Label>
                  <Input id="availability-start" name="startTime" type="time" defaultValue="08:00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="availability-end">Fim</Label>
                  <Input id="availability-end" name="endTime" type="time" defaultValue="12:00" />
                </div>
              </div>
              <Label htmlFor="availability-timezone">Fuso horário</Label>
              <Input
                id="availability-timezone"
                name="timezone"
                defaultValue="America/Fortaleza"
                placeholder="America/Fortaleza"
              />
              <Button type="submit">Criar disponibilidade</Button>
            </form>

            <div className="space-y-2">
              {data.availabilities.map((availability) => (
                <div key={availability._id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{availability.eventTypeTitle}</p>
                    <Badge variant={availability.status === "active" ? "default" : "outline"}>
                      {availability.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {weekdayLabels[availability.weekday]} - {availability.startTime} as {availability.endTime} (
                    {availability.timezone})
                  </p>
                  <form action={setAvailabilityStatusAction} className="mt-2 flex items-center gap-2">
                    <input type="hidden" name="availabilityId" value={availability._id} />
                    <input
                      type="hidden"
                      name="status"
                      value={availability.status === "active" ? "inactive" : "active"}
                    />
                    <Button variant="secondary" size="sm" type="submit">
                      {availability.status === "active" ? "Inativar" : "Ativar"}
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Reservas</CardTitle>
            <CardDescription>Atualize status e observações das reservas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.reservations.map((reservation) => (
              <div key={reservation._id} className="rounded-lg border p-3">
                <p className="font-medium">{reservation.eventTypeTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(reservation.startsAt).toLocaleString("pt-BR")} - {reservation.availabilityLabel}
                </p>
                <p className="text-xs text-muted-foreground">Usuário: {reservation.clerkUserId}</p>
                <form action={setReservationStatusAction} className="mt-2 grid gap-2">
                  <input type="hidden" name="reservationId" value={reservation._id} />
                  <select
                    name="status"
                    className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
                    defaultValue={reservation.status}
                  >
                    <option value="pending">pending</option>
                    <option value="confirmed">confirmed</option>
                    <option value="cancelled">cancelled</option>
                    <option value="completed">completed</option>
                  </select>
                  <Input name="notes" placeholder="Observação opcional" defaultValue={reservation.notes ?? ""} />
                  <Button size="sm" type="submit">
                    Atualizar reserva
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>Atividade agregada por usuário Clerk.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.users.map((user) => (
              <div key={user.clerkUserId} className="rounded-lg border p-3">
                <p className="font-medium">{user.name ?? "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{user.clerkUserId}</p>
                <p className="text-xs text-muted-foreground">
                  {user.email ?? "sem email"} - {user.phone ?? "sem telefone"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Reservas: {user.reservationsCount} | Agendamentos: {user.appointmentsCount} | Pagamentos:{" "}
                  {user.paymentsCount} | Pago: {formatMoney(user.paidAmountCents)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
            <CardDescription>Registrar e atualizar pagamentos vinculados a reservas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createPaymentAction} className="grid gap-2 rounded-lg border p-3">
              <Label htmlFor="payment-reservationId">ID da reserva (opcional)</Label>
              <Input id="payment-reservationId" name="reservationId" placeholder="ex: j57..." />
              <Label htmlFor="payment-clerkUserId">ID de usuário Clerk (se não houver reserva)</Label>
              <Input id="payment-clerkUserId" name="clerkUserId" placeholder="user_..." />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Valor (centavos)</Label>
                  <Input id="payment-amount" name="amountCents" type="number" min={1} defaultValue={10000} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-currency">Moeda</Label>
                  <Input id="payment-currency" name="currency" defaultValue="BRL" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  name="method"
                  className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
                  defaultValue="pix"
                >
                  <option value="pix">pix</option>
                  <option value="card">card</option>
                  <option value="cash">cash</option>
                  <option value="transfer">transfer</option>
                </select>
                <select
                  name="status"
                  className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
                  defaultValue="pending"
                >
                  <option value="pending">pending</option>
                  <option value="paid">paid</option>
                  <option value="refunded">refunded</option>
                  <option value="failed">failed</option>
                </select>
              </div>
              <Input name="externalId" placeholder="ID externo opcional" />
              <Input name="notes" placeholder="Observação opcional" />
              <Button type="submit">Registrar pagamento</Button>
            </form>

            <div className="space-y-2">
              {data.payments.map((payment) => (
                <div key={payment._id} className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{formatMoney(payment.amountCents, payment.currency)}</p>
                    <Badge variant={payment.status === "paid" ? "default" : "outline"}>{payment.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {payment.method} - {payment.currency} - usuário {payment.clerkUserId}
                  </p>
                  <form action={setPaymentStatusAction} className="mt-2 grid gap-2">
                    <input type="hidden" name="paymentId" value={payment._id} />
                    <select
                      name="status"
                      className="h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs"
                      defaultValue={payment.status}
                    >
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                      <option value="refunded">refunded</option>
                      <option value="failed">failed</option>
                    </select>
                    <Input name="notes" defaultValue={payment.notes ?? ""} placeholder="Observação" />
                    <Button size="sm" type="submit">
                      Atualizar pagamento
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Eventos da agenda</CardTitle>
            <CardDescription>Últimos eventos operacionais dos agendamentos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.appointmentEvents.map((event) => (
              <div key={event._id} className="rounded-lg border p-3">
                <p className="font-medium">{event.eventType}</p>
                <p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">usuário: {event.clerkUserId}</p>
                {event.notes ? <p className="text-xs text-muted-foreground">{event.notes}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
