import {
  createEventTypeAction,
  createReservationAction,
  deleteEventTypeAction,
  deleteReservationAction,
  setEventTypeActiveAction,
  updateEventTypeAction,
  updateReservationAction,
} from "@/app/dashboard/admin/actions";
import {
  buildAvailabilityGroups,
  formatDateForInput,
  formatDateTime24h,
  formatMoney,
  formatTimeForInput,
  getAdminSnapshot,
  getAvailabilityById,
  selectClassName,
  weekdayLabels,
} from "@/app/dashboard/admin/_lib/admin-dashboard";
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

export default async function AdminEventsPage() {
  const data = await getAdminSnapshot();
  const availabilityById = getAvailabilityById(data);
  const availabilityGroups = buildAvailabilityGroups(data);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Eventos</CardTitle>
        <CardDescription>CRUD completo para eventos que representam os locais da reserva.</CardDescription>
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
              <div className="space-y-2">
                <Label htmlFor="event-duration">Duracao (min)</Label>
                <Input id="event-duration" name="durationMinutes" type="number" min={5} defaultValue={30} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-stripe-price-id">Stripe Price ID</Label>
                <Input id="event-stripe-price-id" name="stripePriceId" placeholder="price_..." />
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
          <p className="text-xs text-muted-foreground">Crie uma disponibilidade global antes de cadastrar eventos.</p>
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
            const eventReservations = data.reservations.filter((reservation) => reservation.eventTypeId === eventType._id);

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
                    <Input name="stripePriceId" placeholder="price_..." defaultValue={eventType.stripePriceId ?? ""} />
                    <input type="hidden" name="location" value={eventType.location} />
                    <select name="kind" className={selectClassName} defaultValue={eventType.kind ?? "consulta"}>
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
                      {availabilityGroups.length === 0 ? <option value="">Sem disponibilidade cadastrada</option> : null}
                      {availabilityGroups.map((group) => (
                        <option
                          key={`event-update-availability-${eventType._id}-${group.representativeId}`}
                          value={group.representativeId}
                        >
                          {group.name} ({group.slots.length} faixa(s))
                        </option>
                      ))}
                    </select>
                    <select name="active" className={selectClassName} defaultValue={String(eventType.active)}>
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
                    <p className="text-xs text-muted-foreground">Este evento está sem disponibilidade vinculada.</p>
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
                        <DialogDescription>Cadastre uma reserva para este evento e usuario.</DialogDescription>
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
                          <select name="status" className={selectClassName} defaultValue="pending">
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
                          <select name="status" className={selectClassName} defaultValue={reservation.status}>
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
  );
}
