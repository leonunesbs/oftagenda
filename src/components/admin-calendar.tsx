"use client";

import { DndContext, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReservationStatus } from "@/lib/reservation-status";
import { reservationStatusLabel } from "@/lib/reservation-status";
import { usePathname, useRouter } from "next/navigation";

type CalendarItem = {
  _id: string;
  reservationId: string;
  startsAt: number;
  endsAt: number;
  status: ReservationStatus;
  eventTypeTitle: string;
  kind: "consulta" | "procedimento" | "exame";
  clerkUserId: string;
  eventTypeId: string;
  availabilityId: string;
  notes: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  patientBirthDate?: string;
};

type AdminCalendarProps = {
  items: CalendarItem[];
};

const KIND_CLASS: Record<CalendarItem["kind"], string> = {
  consulta: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  exame: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  procedimento: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
};

const STATUS_CARD_CLASS: Record<ReservationStatus, string> = {
  pending: "border border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  awaiting_patient:
    "border border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  confirmed: "border border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  in_care: "border border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  surgery_planned: "border border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  postop_followup: "border border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  completed: "border border-slate-200 bg-slate-100 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200",
  cancelled: "border border-rose-200 bg-rose-100 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100",
  no_show: "border border-rose-200 bg-rose-100 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100",
};

type ViewMode = "week" | "day";
const SLOT_ID_PREFIX = "slot";
const RESERVATION_ID_PREFIX = "reservation";
const SLOT_DURATION_MINUTES = 30;
const CALENDAR_START_HOUR = 7;
const CALENDAR_END_HOUR = 20;

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

function formatPhoneLabel(phone: string) {
  const digits = phone.replace(/\D+/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone || "Não informado";
}

function calculateAge(date: Date) {
  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate());
  if (!hasBirthdayPassed) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function formatBirthDateLabel(value?: string) {
  if (!value) {
    return "Não informada";
  }
  const asDate = new Date(value);
  if (!Number.isNaN(asDate.getTime())) {
    const age = calculateAge(asDate);
    const formattedDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(asDate);
    if (age === null) {
      return formattedDate;
    }
    return `${formattedDate} (${age} anos)`;
  }
  return value;
}

function buildSlotDropId(date: string, time: string) {
  return `${SLOT_ID_PREFIX}:${date}:${time}`;
}

function parseSlotDropId(rawId: string) {
  if (!rawId.startsWith(`${SLOT_ID_PREFIX}:`)) {
    return null;
  }
  const [, date, time] = rawId.split(":");
  if (!date || !time) {
    return null;
  }
  return { date, time };
}

function buildReservationDragId(reservationId: string) {
  return `${RESERVATION_ID_PREFIX}:${reservationId}`;
}

function parseReservationDragId(rawId: string) {
  if (!rawId.startsWith(`${RESERVATION_ID_PREFIX}:`)) {
    return null;
  }
  const reservationId = rawId.slice(`${RESERVATION_ID_PREFIX}:`.length);
  return reservationId ? { reservationId } : null;
}

function DraggableReservationCard({ item, agendaPath }: { item: CalendarItem; agendaPath: string }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: buildReservationDragId(item.reservationId),
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`block w-full rounded-md px-2 py-1 text-left text-[11px] ${
        STATUS_CARD_CLASS[item.status]
      } ${isDragging ? "opacity-70" : ""}`}
      onClick={() => router.push(`${agendaPath}/status/${item.reservationId}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`${agendaPath}/status/${item.reservationId}`);
        }
      }}
      {...listeners}
      {...attributes}
    >
      <p className="font-medium">{item.eventTypeTitle}</p>
      <p className="text-[10px]">
        <span className={`mr-1 inline-block rounded px-1 py-0.5 align-middle ${KIND_CLASS[item.kind]}`}>{item.kind}</span>
        <span className="align-middle">{reservationStatusLabel[item.status]}</span>
      </p>
      <p className="truncate text-[10px] font-medium">Paciente: {item.patientName || "Sem nome"}</p>
      <p className="truncate text-[10px]">Telefone: {formatPhoneLabel(item.patientPhone)}</p>
      <p className="truncate text-[10px]">Nascimento: {formatBirthDateLabel(item.patientBirthDate)}</p>
    </div>
  );
}

function AgendaSlotCell({
  dayKey,
  slot,
  slotItems,
  day,
  openCreateRoute,
  agendaPath,
  liveMarkerOffsetPercent,
}: {
  dayKey: string;
  slot: string;
  slotItems: CalendarItem[];
  day: Date;
  openCreateRoute: (day: Date, slot: string) => void;
  agendaPath: string;
  liveMarkerOffsetPercent: number | null;
}) {
  const isEmptySlot = slotItems.length === 0;
  const { isOver, setNodeRef } = useDroppable({
    id: buildSlotDropId(dayKey, slot),
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-12 border-b border-l p-1 text-left ${isEmptySlot ? "cursor-pointer hover:bg-muted/40" : ""} ${
        isOver ? "bg-primary/10" : ""
      }`}
      role={isEmptySlot ? "button" : undefined}
      tabIndex={isEmptySlot ? 0 : undefined}
      onClick={() => {
        if (isEmptySlot) {
          openCreateRoute(day, slot);
        }
      }}
      onKeyDown={(event) => {
        if (!isEmptySlot) {
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCreateRoute(day, slot);
        }
      }}
    >
      {liveMarkerOffsetPercent !== null ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-rose-500"
          style={{ top: `${liveMarkerOffsetPercent}%` }}
          aria-hidden
        />
      ) : null}
      <div className="space-y-1">
        {slotItems.map((item) => (
          <DraggableReservationCard key={item._id} item={item} agendaPath={agendaPath} />
        ))}
      </div>
    </div>
  );
}

export function AdminCalendar({ items }: AdminCalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const agendaPath = pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    let intervalId: number | undefined;
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
    const timeoutId = window.setTimeout(() => {
      updateNow();
      intervalId = window.setInterval(updateNow, 60_000);
    }, msUntilNextMinute);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

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
    for (let hour = CALENDAR_START_HOUR; hour <= CALENDAR_END_HOUR; hour += 1) {
      slots.push(`${String(hour).padStart(2, "0")}:00`);
      if (hour < CALENDAR_END_HOUR) {
        slots.push(`${String(hour).padStart(2, "0")}:30`);
      }
    }
    return slots;
  }, []);

  const liveMarker = useMemo(() => {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const calendarStartMinutes = CALENDAR_START_HOUR * 60;
    const firstSlotIndex = Math.floor((currentMinutes - calendarStartMinutes) / SLOT_DURATION_MINUTES);
    if (firstSlotIndex < 0 || firstSlotIndex >= timeSlots.length) {
      return null;
    }
    const minuteOffsetInsideSlot = (currentMinutes - calendarStartMinutes) % SLOT_DURATION_MINUTES;
    const offsetPercent = (minuteOffsetInsideSlot / SLOT_DURATION_MINUTES) * 100;
    return {
      dayKey: toDateInput(now),
      slot: timeSlots[firstSlotIndex],
      offsetPercent,
    };
  }, [now, timeSlots]);

  function shiftPeriod(direction: "prev" | "next") {
    const next = new Date(anchorDate);
    const step = viewMode === "week" ? 7 : 1;
    next.setDate(next.getDate() + (direction === "next" ? step : -step));
    setAnchorDate(next);
  }

  function openCreateRoute(day: Date, slot: string) {
    const date = toDateInput(day);
    router.push(`${agendaPath}/novo-agendamento?date=${date}&time=${slot}`);
  }

  const nextOperations = useMemo(
    () => [...items].filter((item) => item.status !== "cancelled").sort((a, b) => a.startsAt - b.startsAt).slice(0, 14),
    [items],
  );
  const reservationById = useMemo(() => new Map(items.map((item) => [item.reservationId, item])), [items]);

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over) {
      return;
    }
    const source = parseReservationDragId(String(event.active.id));
    const target = parseSlotDropId(String(event.over.id));
    if (!source || !target) {
      return;
    }
    const current = reservationById.get(source.reservationId);
    if (!current) {
      return;
    }
    const currentDate = toDateInput(new Date(current.startsAt));
    const currentTime = toTimeInput(new Date(current.startsAt));
    if (currentDate === target.date && currentTime === target.time) {
      return;
    }
    router.push(
      `${agendaPath}/reagendar/${source.reservationId}?date=${target.date}&time=${target.time}&fromDragDrop=true`,
    );
  }

  return (
    <div className="min-w-0 space-y-3">
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
            Próxima
          </Button>
          <Button asChild>
            <Link href={`${agendaPath}/novo-agendamento`} prefetch={false}>
              Novo agendamento
            </Link>
          </Button>
        </div>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="w-full max-w-full overflow-x-auto rounded-xl border">
          <div
            className="grid w-max"
            style={{
              gridTemplateColumns: `90px repeat(${calendarDays.length}, 170px)`,
            }}
          >
            <div className="border-b bg-muted/40 p-2 text-xs font-medium">Horário</div>
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
                  return (
                    <AgendaSlotCell
                      key={`${dayKey}-${slot}`}
                      dayKey={dayKey}
                      slot={slot}
                      slotItems={slotItems}
                      day={day}
                      openCreateRoute={openCreateRoute}
                      agendaPath={agendaPath}
                      liveMarkerOffsetPercent={
                        liveMarker && liveMarker.dayKey === dayKey && liveMarker.slot === slot ? liveMarker.offsetPercent : null
                      }
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </DndContext>

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Legenda de leitura rápida</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Badge className={STATUS_CARD_CLASS.pending}>Pendente / aguardando paciente</Badge>
            <Badge className={STATUS_CARD_CLASS.confirmed}>Confirmado / em atendimento</Badge>
            <Badge className={STATUS_CARD_CLASS.surgery_planned}>Planejado / pós-operatório / concluído</Badge>
            <Badge className={STATUS_CARD_CLASS.cancelled}>Cancelado / não compareceu</Badge>
            <Badge className={KIND_CLASS.consulta}>Tipo: consulta</Badge>
            <Badge className={KIND_CLASS.exame}>Tipo: exame</Badge>
            <Badge className={KIND_CLASS.procedimento}>Tipo: procedimento</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Operação rápida da secretária</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextOperations.length > 0 ? (
              nextOperations.map((item) => (
                <div key={item._id} className="rounded-md border p-2">
                  <p className="truncate text-sm font-medium">{item.patientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      hour12: false,
                    }).format(new Date(item.startsAt))}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${agendaPath}/reagendar/${item.reservationId}`} prefetch={false}>
                        Reagendar
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${agendaPath}/status/${item.reservationId}`} prefetch={false}>
                        Status
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${agendaPath}/contato/${item.reservationId}`} prefetch={false}>
                        Contato
                      </Link>
                    </Button>
                    <Button asChild variant="destructive" size="sm">
                      <Link href={`${agendaPath}/cancelar/${item.reservationId}`} prefetch={false}>
                        Cancelar
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Não há reservas ativas para operação rápida.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Painel de lembretes por e-mail</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
          <p>Abra a ação de contato para disparar lembrete 24h com modelo pronto de e-mail.</p>
          <p>Use a ação de reagendamento para atualizar data e horário sem sair da agenda.</p>
          <p>Os registros recentes ficam disponíveis no drawer da reserva selecionada.</p>
        </CardContent>
      </Card>
    </div>
  );
}
