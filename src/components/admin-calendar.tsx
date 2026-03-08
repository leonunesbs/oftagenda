"use client";

import { useMemo, useState } from "react";
import { setReservationStatusAction, updateReservationAction } from "@/app/dashboard/admin/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminCreateAppointmentDialog } from "@/components/admin-create-appointment-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CalendarItem = {
  _id: string;
  reservationId: string;
  startsAt: number;
  endsAt: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  eventTypeTitle: string;
  kind: "consulta" | "procedimento" | "exame";
  clerkUserId: string;
  eventTypeId: string;
  availabilityId: string;
  notes: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
};

type EventTypeOption = {
  _id: string;
  name?: string;
  title: string;
  kind?: "consulta" | "procedimento" | "exame";
  availabilityId?: string;
  location: "fortaleza" | "sao_domingos_do_maranhao" | "fortuna";
  active: boolean;
};

type AvailabilityGroupOption = {
  name: string;
  representativeId: string;
};

type AdminCalendarProps = {
  items: CalendarItem[];
  eventTypes: EventTypeOption[];
  availabilityGroups: AvailabilityGroupOption[];
};

const KIND_CLASS: Record<CalendarItem["kind"], string> = {
  consulta: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  exame: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  procedimento: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
};

type ViewMode = "week" | "day";

function startOfWeek(date: Date) {
  const next = new Date(date);
  const diff = next.getDay();
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - diff);
  return next;
}

function toDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTimeInput(date: Date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function weekdayLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export function AdminCalendar({ items, eventTypes, availabilityGroups }: AdminCalendarProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);

  const calendarDays = useMemo(() => {
    if (viewMode === "day") {
      const current = new Date(anchorDate);
      current.setHours(0, 0, 0, 0);
      return [current];
    }
    const start = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, index) => {
      const next = new Date(start);
      next.setDate(start.getDate() + index);
      return next;
    });
  }, [anchorDate, viewMode]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const day of calendarDays) {
      map.set(toDateInput(day), []);
    }
    for (const item of items) {
      const dateKey = toDateInput(new Date(item.startsAt));
      if (!map.has(dateKey)) {
        continue;
      }
      const current = map.get(dateKey) ?? [];
      current.push(item);
      map.set(dateKey, current);
    }
    for (const [key, dayItems] of map.entries()) {
      map.set(
        key,
        dayItems.sort((a, b) => a.startsAt - b.startsAt),
      );
    }
    return map;
  }, [calendarDays, items]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 7; hour <= 20; hour += 1) {
      slots.push(`${String(hour).padStart(2, "0")}:00`);
      if (hour < 20) {
        slots.push(`${String(hour).padStart(2, "0")}:30`);
      }
    }
    return slots;
  }, []);

  function shiftPeriod(direction: "prev" | "next") {
    const next = new Date(anchorDate);
    const step = viewMode === "week" ? 7 : 1;
    next.setDate(next.getDate() + (direction === "next" ? step : -step));
    setAnchorDate(next);
  }

  function openDialogFromSlot(day: Date, slot: string) {
    setSelectedSlot({ date: toDateInput(day), time: slot });
    setCreateDialogOpen(true);
  }

  function formatDateTime(timestamp: number) {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(timestamp));
  }

  function normalizePhoneForWhatsapp(phone: string) {
    const digits = phone.replace(/\D+/g, "");
    if (!digits) {
      return "";
    }
    if (digits.startsWith("55")) {
      return digits;
    }
    return `55${digits}`;
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "week" ? "default" : "outline"} size="sm" onClick={() => setViewMode("week")}>
            Semana
          </Button>
          <Button variant={viewMode === "day" ? "default" : "outline"} size="sm" onClick={() => setViewMode("day")}>
            Dia
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => shiftPeriod("prev")}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchorDate(new Date())}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => shiftPeriod("next")}>
            Proxima
          </Button>
          <AdminCreateAppointmentDialog
            triggerLabel="Novo agendamento"
            eventTypes={eventTypes}
            availabilityGroups={availabilityGroups}
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            initialDate={selectedSlot?.date}
            initialTime={selectedSlot?.time}
          />
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-auto rounded-xl border">
        <div
          className="grid w-max"
          style={{
            gridTemplateColumns: `140px repeat(${calendarDays.length}, 160px)`,
          }}
        >
          <div className="border-b bg-muted/40 p-2 text-xs font-medium">Horario</div>
          {calendarDays.map((day) => (
            <div key={toDateInput(day)} className="border-b border-l bg-muted/40 p-2 text-xs font-medium">
              {weekdayLabel(day)}
            </div>
          ))}

          {timeSlots.map((slot) => (
            <div key={`row-${slot}`} className="contents">
              <div className="border-b p-2 text-xs text-muted-foreground">
                {slot}
              </div>
              {calendarDays.map((day) => {
                const dayKey = toDateInput(day);
                const dayItems = itemsByDay.get(dayKey) ?? [];
                const slotItems = dayItems.filter((item) => toTimeInput(new Date(item.startsAt)) === slot);
                const isEmptySlot = slotItems.length === 0;
                return (
                  <div
                    key={`${dayKey}-${slot}`}
                    className={`min-h-12 border-b border-l p-1 text-left ${isEmptySlot ? "cursor-pointer hover:bg-muted/40" : ""}`}
                    role={isEmptySlot ? "button" : undefined}
                    tabIndex={isEmptySlot ? 0 : undefined}
                    onClick={() => {
                      if (isEmptySlot) {
                        openDialogFromSlot(day, slot);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (!isEmptySlot) {
                        return;
                      }
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDialogFromSlot(day, slot);
                      }
                    }}
                  >
                    <div className="space-y-1">
                      {slotItems.map((item) => (
                        <button
                          type="button"
                          key={item._id}
                          className={`w-full rounded-md px-2 py-1 text-left text-[11px] ${KIND_CLASS[item.kind]}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedItem(item);
                          }}
                        >
                          <p className="font-medium">{item.eventTypeTitle}</p>
                          <p className="text-[10px]">{item.patientName}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Legenda e status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge className={KIND_CLASS.consulta}>consulta</Badge>
          <Badge className={KIND_CLASS.exame}>exame</Badge>
          <Badge className={KIND_CLASS.procedimento}>procedimento</Badge>
          <Badge variant="outline">pending</Badge>
          <Badge variant="default">confirmed</Badge>
          <Badge variant="outline">completed/cancelled</Badge>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerenciar agendamento</DialogTitle>
            <DialogDescription>Ajuste horário, status, observações e contato do paciente.</DialogDescription>
          </DialogHeader>

          {selectedItem ? (
            <div className="space-y-4">
              <div className="rounded-md border p-3 text-sm">
                <p className="font-medium">{selectedItem.eventTypeTitle}</p>
                <p className="text-muted-foreground">{formatDateTime(selectedItem.startsAt)}</p>
                <p className="text-muted-foreground">
                  {selectedItem.patientName} ({selectedItem.clerkUserId})
                </p>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                {selectedItem.patientPhone ? (
                  <>
                    <Button variant="outline" asChild>
                      <a href={`tel:${selectedItem.patientPhone}`}>Ligar</a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href={`https://wa.me/${normalizePhoneForWhatsapp(selectedItem.patientPhone)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    </Button>
                  </>
                ) : null}
                {selectedItem.patientEmail ? (
                  <Button variant="outline" asChild>
                    <a href={`mailto:${selectedItem.patientEmail}`}>E-mail</a>
                  </Button>
                ) : null}
              </div>

              <form action={updateReservationAction} className="grid gap-2 rounded-md border p-3">
                <p className="text-sm font-medium">Remarcar / atualizar</p>
                <input type="hidden" name="reservationId" value={selectedItem.reservationId} />
                <input type="hidden" name="clerkUserId" value={selectedItem.clerkUserId} />
                <input type="hidden" name="eventTypeId" value={selectedItem.eventTypeId} />
                <input type="hidden" name="availabilityId" value={selectedItem.availabilityId} />
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="manage-date">Data</Label>
                    <Input id="manage-date" name="date" type="date" defaultValue={toDateInput(new Date(selectedItem.startsAt))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="manage-time">Horario</Label>
                    <Input id="manage-time" name="time" type="time" defaultValue={toTimeInput(new Date(selectedItem.startsAt))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="manage-status">Status</Label>
                    <select id="manage-status" name="status" className="h-9 rounded-md border border-input bg-input/20 px-2 text-sm" defaultValue={selectedItem.status}>
                      <option value="pending">pending</option>
                      <option value="confirmed">confirmed</option>
                      <option value="completed">completed</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </div>
                </div>
                <Textarea name="notes" placeholder="Observacoes administrativas" defaultValue={selectedItem.notes} />
                <Button type="submit">Salvar alteracoes</Button>
              </form>

              <form action={setReservationStatusAction} className="grid gap-2 rounded-md border p-3">
                <p className="text-sm font-medium">Observacoes rapidas</p>
                <input type="hidden" name="reservationId" value={selectedItem.reservationId} />
                <input type="hidden" name="status" value={selectedItem.status} />
                <Textarea name="notes" placeholder="Registrar observacao sem alterar horario" defaultValue={selectedItem.notes} />
                <Button type="submit" variant="outline">
                  Salvar observacao
                </Button>
              </form>

              {selectedItem.status !== "cancelled" ? (
                <form action={setReservationStatusAction} className="rounded-md border border-destructive/40 p-3">
                  <input type="hidden" name="reservationId" value={selectedItem.reservationId} />
                  <input type="hidden" name="status" value="cancelled" />
                  <input type="hidden" name="notes" value="Cancelado pelo admin via agenda visual." />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive">
                        Cancelar agendamento
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar cancelamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O agendamento sera cancelado e o status sera atualizado para cancelled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction type="submit">Confirmar cancelamento</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </form>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
