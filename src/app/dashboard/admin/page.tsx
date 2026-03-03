import Link from "next/link";
import { api } from "@convex/_generated/api";
import {
  createReservationAction,
  createEventTypeAction,
  createPaymentAction,
  deleteEventTypeAction,
  deleteReservationAction,
  setEventTypeActiveAction,
  setPaymentStatusAction,
  setReservationStatusAction,
  updateEventTypeAction,
  updateReservationAction,
} from "@/app/dashboard/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const selectClassName = "h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs";

function formatMoney(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function formatDateForInput(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(timestamp: number) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatDateTime24h(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(timestamp));
}

function timeToMinutes(time: string) {
  const parts = time.split(":");
  const hours = Number(parts[0] ?? "0");
  const minutes = Number(parts[1] ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

function resolveAvailabilityGroupName(availability: { _id: string; name?: string }) {
  const normalized = availability.name?.trim();
  if (normalized && normalized.length > 0) {
    return normalized;
  }
  return `Disponibilidade-${availability._id}`;
}

async function getAdminSnapshot() {
  const { client } = await getAuthenticatedConvexHttpClient();
  return client.query(api.admin.getManagementSnapshot, {});
}

export default async function AdminDashboardPage() {
  let data: Awaited<ReturnType<typeof getAdminSnapshot>>;
  try {
    data = await getAdminSnapshot();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao carregar dados administrativos. Verifique a integração Clerk + Convex.";

    return (
      <section className="mx-auto w-full max-w-3xl space-y-6">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Painel administrativo indisponível</CardTitle>
            <CardDescription>
              Não foi possível autenticar sua sessão no Convex para carregar o painel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{message}</p>
            <p>
              Verifique apenas se o usuário possui <code>public_metadata.role = "admin"</code>.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const availabilityById = new Map(data.availabilities.map((availability) => [String(availability._id), availability]));
  const availabilityGroupsMap = new Map<
    string,
    {
      name: string;
      representativeId: string;
      linkedEventsCount: number;
      slots: (typeof data.availabilities)[number][];
    }
  >();
  for (const availability of data.availabilities) {
    const groupName = resolveAvailabilityGroupName({
      _id: String(availability._id),
      name: availability.name,
    });
    const current =
      availabilityGroupsMap.get(groupName) ??
      {
        name: groupName,
        representativeId: String(availability._id),
        linkedEventsCount: 0,
        slots: [],
      };
    current.slots.push(availability);
    current.linkedEventsCount = Math.max(current.linkedEventsCount, availability.linkedEventsCount ?? 0);
    availabilityGroupsMap.set(groupName, current);
  }
  const availabilityGroups = [...availabilityGroupsMap.values()]
    .map((group) => ({
      ...group,
      slots: [...group.slots].sort((a, b) => {
        if (a.weekday !== b.weekday) {
          return a.weekday - b.weekday;
        }
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

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
            <CardDescription>
              CRUD completo para eventos que representam os locais da reserva.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button disabled={availabilityGroups.length === 0}>Cadastrar evento</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo evento</DialogTitle>
                  <DialogDescription>Preencha os dados para cadastrar um novo evento.</DialogDescription>
                </DialogHeader>
                <form action={createEventTypeAction} className="grid gap-2">
                  <Label htmlFor="event-slug">Slug</Label>
                  <Input id="event-slug" name="slug" required placeholder="consulta-oftalmologica" />
                  <Label htmlFor="event-name">Nome do evento</Label>
                  <Input id="event-name" name="name" required placeholder="Consulta oftalmologica inicial" />
                  <Label htmlFor="event-address">Endereco</Label>
                  <Input id="event-address" name="address" required placeholder="Rua Exemplo, 123 - Centro" />
                  <Label htmlFor="event-notes">Observacoes</Label>
                  <Textarea id="event-notes" name="notes" placeholder="Complemento opcional" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="event-duration">Duracao (min)</Label>
                      <Input id="event-duration" name="durationMinutes" type="number" min={5} defaultValue={30} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-price">Valor (R$)</Label>
                      <Input
                        id="event-price"
                        name="priceReais"
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event-stripe-price-id">Stripe Price ID</Label>
                    <Input
                      id="event-stripe-price-id"
                      name="stripePriceId"
                      placeholder="price_..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="event-kind">Tipo</Label>
                      <select id="event-kind" name="kind" className={selectClassName} defaultValue="consulta">
                        <option value="consulta">consulta</option>
                        <option value="procedimento">procedimento</option>
                        <option value="exame">exame</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-availability">Disponibilidade</Label>
                      <select
                        id="event-availability"
                        name="availabilityId"
                        className={selectClassName}
                        defaultValue={availabilityGroups[0]?.representativeId}
                        required
                        disabled={availabilityGroups.length === 0}
                      >
                        {availabilityGroups.map((group) => (
                          <option key={`event-create-availability-${group.representativeId}`} value={group.representativeId}>
                            {group.name} ({group.slots.length} faixa(s))
                          </option>
                        ))}
                      </select>
                    </div>
                    <input type="hidden" name="location" value="fortaleza" />
                  </div>
                  <Button type="submit" disabled={availabilityGroups.length === 0}>
                    Criar evento
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            {availabilityGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Crie uma disponibilidade global antes de cadastrar eventos.
              </p>
            ) : null}

            <div className="space-y-2">
              {data.eventTypes.map((eventType) => {
                const linkedAvailability = eventType.availabilityId
                  ? availabilityById.get(String(eventType.availabilityId)) ?? null
                  : null;
                const linkedAvailabilityGroup = linkedAvailability
                  ? availabilityGroups.find((group) =>
                      group.slots.some((slot) => String(slot._id) === String(linkedAvailability._id)),
                    ) ?? null
                  : null;
                const eventReservations = data.reservations.filter(
                  (reservation) => reservation.eventTypeId === eventType._id,
                );
                return (
                  <div key={eventType._id} className="space-y-3 rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-medium">{eventType.name ?? eventType.title}</p>
                    <Badge variant={eventType.active ? "default" : "outline"}>
                      {eventType.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {eventType.slug} - {eventType.kind ?? "consulta"} - {eventType.durationMinutes} min -{" "}
                    {formatMoney(eventType.priceCents ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">{eventType.address ?? "Sem endereço"}</p>
                  <form action={updateEventTypeAction} className="mt-3 grid gap-2 rounded-md border p-2">
                    <input type="hidden" name="eventTypeId" value={eventType._id} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input name="slug" defaultValue={eventType.slug} required />
                      <Input name="name" defaultValue={eventType.name ?? eventType.title} required />
                    </div>
                    <Input name="address" defaultValue={eventType.address ?? ""} required />
                    <Textarea
                      name="notes"
                      defaultValue={eventType.notes ?? eventType.description ?? ""}
                      placeholder="Descrição opcional"
                    />
                    <div className="grid grid-cols-4 gap-2">
                      <Input name="durationMinutes" type="number" min={5} defaultValue={eventType.durationMinutes} />
                      <Input
                        name="priceReais"
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={((eventType.priceCents ?? 0) / 100).toFixed(2)}
                      />
                      <Input
                        name="stripePriceId"
                        placeholder="price_..."
                        defaultValue={eventType.stripePriceId ?? ""}
                      />
                      <input type="hidden" name="location" value={eventType.location} />
                      <select
                        name="kind"
                        className={selectClassName}
                        defaultValue={eventType.kind ?? "consulta"}
                      >
                        <option value="consulta">consulta</option>
                        <option value="procedimento">procedimento</option>
                        <option value="exame">exame</option>
                      </select>
                      <select
                        name="availabilityId"
                        className={selectClassName}
                        defaultValue={
                          eventType.availabilityId
                            ? availabilityGroups.find((group) =>
                                group.slots.some((slot) => String(slot._id) === String(eventType.availabilityId)),
                              )?.representativeId ?? String(eventType.availabilityId)
                            : ""
                        }
                        required
                        disabled={availabilityGroups.length === 0}
                      >
                        {availabilityGroups.length === 0 ? (
                          <option value="">Sem disponibilidade cadastrada</option>
                        ) : null}
                        {availabilityGroups.map((group) => (
                          <option
                            key={`event-update-availability-${eventType._id}-${group.representativeId}`}
                            value={group.representativeId}
                          >
                            {group.name} ({group.slots.length} faixa(s))
                          </option>
                        ))}
                      </select>
                      <select
                        name="active"
                        className={selectClassName}
                        defaultValue={String(eventType.active)}
                      >
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                    </div>
                    <Button variant="secondary" size="sm" type="submit">
                      Salvar alterações
                    </Button>
                  </form>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <form action={setEventTypeActiveAction}>
                      <input type="hidden" name="eventTypeId" value={eventType._id} />
                      <input type="hidden" name="active" value={String(!eventType.active)} />
                      <Button variant="outline" size="sm" type="submit">
                        {eventType.active ? "Inativar rápido" : "Ativar rápido"}
                      </Button>
                    </form>
                    <form action={deleteEventTypeAction}>
                      <input type="hidden" name="eventTypeId" value={eventType._id} />
                      <Button variant="destructive" size="sm" type="submit">
                        Excluir
                      </Button>
                    </form>
                    <p className="text-[11px] text-muted-foreground">
                      Exclusão só funciona sem reservas ou agendamentos vinculados.
                    </p>
                  </div>
                  <div className="space-y-2 rounded-md border border-dashed p-2">
                    <p className="text-xs font-medium">Disponibilidade vinculada ao evento</p>
                    {linkedAvailabilityGroup ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium">{linkedAvailabilityGroup.name}</p>
                        {linkedAvailabilityGroup.slots.map((slot) => (
                          <p key={`event-linked-slot-${eventType._id}-${slot._id}`} className="text-xs text-muted-foreground">
                            {weekdayLabels[slot.weekday]} - {slot.startTime} as {slot.endTime} ({slot.timezone})
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Este evento está sem disponibilidade vinculada.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 rounded-md border border-dashed p-2">
                    <p className="text-xs font-medium">Reservas deste evento</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" disabled={!eventType.availabilityId}>
                          Nova reserva
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-xl">
                        <DialogHeader>
                          <DialogTitle>Nova reserva</DialogTitle>
                          <DialogDescription>
                            Cadastre uma reserva para este evento e usuario.
                          </DialogDescription>
                        </DialogHeader>
                        <form action={createReservationAction} className="grid gap-2 rounded-md border p-2">
                          <input type="hidden" name="eventTypeId" value={eventType._id} />
                          <input type="hidden" name="availabilityId" value={eventType.availabilityId ?? ""} />
                          <Input name="clerkUserId" placeholder="user_..." required />
                          <div className="grid grid-cols-3 gap-2">
                            <Input name="date" type="date" required />
                            <Input
                              name="time"
                              type="time"
                              step={300}
                              required
                              aria-label="Horario"
                              title="Use formato 24h (HH:mm)"
                            />
                            <select
                              name="status"
                              className={selectClassName}
                              defaultValue="pending"
                            >
                              <option value="pending">pending</option>
                              <option value="confirmed">confirmed</option>
                              <option value="cancelled">cancelled</option>
                              <option value="completed">completed</option>
                            </select>
                          </div>
                          {linkedAvailability ? (
                            <p className="text-xs text-muted-foreground">
                              Usando grupo: {linkedAvailabilityGroup?.name ?? "Disponibilidade"}
                            </p>
                          ) : (
                            <p className="text-xs text-destructive">
                              Vincule uma disponibilidade ao evento para criar reservas.
                            </p>
                          )}
                          <Input name="notes" placeholder="Observacao opcional" />
                          <Button size="sm" type="submit" disabled={!eventType.availabilityId}>
                            Salvar reserva
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    {eventReservations.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sem reservas para este evento.</p>
                    ) : null}
                    {eventReservations.map((reservation) => (
                      <div key={reservation._id} className="rounded-md border p-2">
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime24h(reservation.startsAt)} - {reservation.availabilityLabel}
                        </p>
                        <form action={updateReservationAction} className="mt-2 grid gap-2">
                          <input type="hidden" name="reservationId" value={reservation._id} />
                          <input type="hidden" name="eventTypeId" value={eventType._id} />
                          <input
                            type="hidden"
                            name="availabilityId"
                            value={eventType.availabilityId ?? reservation.availabilityId}
                          />
                          <Input name="clerkUserId" defaultValue={reservation.clerkUserId} required />
                          <div className="grid grid-cols-3 gap-2">
                            <Input name="date" type="date" defaultValue={formatDateForInput(reservation.startsAt)} />
                            <Input
                              name="time"
                              type="time"
                              step={300}
                              defaultValue={formatTimeForInput(reservation.startsAt)}
                              aria-label="Horário"
                              title="Use formato 24h (HH:mm)"
                            />
                            <select
                              name="status"
                              className={selectClassName}
                              defaultValue={reservation.status}
                            >
                              <option value="pending">pending</option>
                              <option value="confirmed">confirmed</option>
                              <option value="cancelled">cancelled</option>
                              <option value="completed">completed</option>
                            </select>
                          </div>
                          {linkedAvailability ? (
                            <p className="text-xs text-muted-foreground">
                              Grupo vinculado: {linkedAvailabilityGroup?.name ?? "Disponibilidade"}
                            </p>
                          ) : null}
                          <Input name="notes" defaultValue={reservation.notes ?? ""} placeholder="Observação" />
                          <Button size="sm" variant="secondary" type="submit">
                            Salvar reserva
                          </Button>
                        </form>
                        <form action={deleteReservationAction} className="mt-2">
                          <input type="hidden" name="reservationId" value={reservation._id} />
                          <Button size="sm" variant="destructive" type="submit">
                            Excluir reserva
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>Disponibilidade</CardTitle>
            <CardDescription>
              Visualize as disponibilidades cadastradas e abra a edicao de horarios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button size="sm" asChild>
                  <Link href="/dashboard/admin/nova-disponibilidade">Nova disponibilidade</Link>
                </Button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {availabilityGroups.map((group) => (
                  <div key={`availability-card-${group.representativeId}`} className="rounded-lg border p-3">
                    <p className="text-sm font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.slots.length} faixa(s) - {group.slots[0]?.timezone ?? "sem timezone"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vinculado a {group.linkedEventsCount.toString()} evento(s)
                    </p>
                    <Button className="mt-3" size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/admin/disponibilidade/${group.representativeId}`}>Editar horarios</Link>
                    </Button>
                  </div>
                ))}
              </div>
              {availabilityGroups.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma disponibilidade cadastrada.</p>
              ) : null}
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
                  {formatDateTime24h(reservation.startsAt)} - {reservation.availabilityLabel}
                </p>
                <p className="text-xs text-muted-foreground">Usuário: {reservation.clerkUserId}</p>
                <form action={setReservationStatusAction} className="mt-2 grid gap-2">
                  <input type="hidden" name="reservationId" value={reservation._id} />
                  <select
                    name="status"
                    className={selectClassName}
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
            <Dialog>
              <DialogTrigger asChild>
                <Button>Registrar pagamento</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Novo pagamento</DialogTitle>
                  <DialogDescription>Cadastre um pagamento no sistema.</DialogDescription>
                </DialogHeader>
                <form action={createPaymentAction} className="grid gap-2 rounded-lg border p-3">
                  <Label htmlFor="payment-reservationId">ID da reserva (opcional)</Label>
                  <Input id="payment-reservationId" name="reservationId" placeholder="ex: j57..." />
                  <Label htmlFor="payment-clerkUserId">ID de usuario Clerk (se nao houver reserva)</Label>
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
                      className={selectClassName}
                      defaultValue="pix"
                    >
                      <option value="pix">pix</option>
                      <option value="card">card</option>
                      <option value="cash">cash</option>
                      <option value="transfer">transfer</option>
                    </select>
                    <select
                      name="status"
                      className={selectClassName}
                      defaultValue="pending"
                    >
                      <option value="pending">pending</option>
                      <option value="paid">paid</option>
                      <option value="refunded">refunded</option>
                      <option value="failed">failed</option>
                    </select>
                  </div>
                  <Input name="externalId" placeholder="ID externo opcional" />
                  <Input name="notes" placeholder="Observacao opcional" />
                  <Button type="submit">Salvar pagamento</Button>
                </form>
              </DialogContent>
            </Dialog>

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
                      className={selectClassName}
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
                <p className="text-xs text-muted-foreground">{formatDateTime24h(event.createdAt)}</p>
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
