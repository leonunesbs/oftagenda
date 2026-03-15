"use client";

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
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { closeParallelRoute } from "@/lib/parallel-route-navigation";
import {
  reservationStatusBadgeVariant,
  reservationStatusLabel,
  type ReservationStatus,
} from "@/lib/reservation-status";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

type ReservationActionMode = "reagendar" | "status" | "cancelar" | "contato";

type ReservationActionData = {
  _id: string;
  clerkUserId: string;
  appointmentId: string | null;
  eventTypeId: string;
  availabilityId: string;
  eventTypeTitle: string;
  eventKind: "consulta" | "procedimento" | "exame";
  location: "fortaleza" | "sao_domingos_do_maranhao" | "fortuna";
  availabilityLabel: string;
  status: ReservationStatus;
  startsAt: number;
  updatedAt: number;
  notes?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  patientBirthDate?: string;
  recentTimeline: Array<{
    id: string;
    eventType: "created" | "confirmed" | "rescheduled" | "no_show" | "cancelled" | "completed" | "details_submitted";
    label: string;
    notes: string;
    createdAt: number;
  }>;
};

type AdminReservationActionViewProps = {
  mode: ReservationActionMode;
  reservation: ReservationActionData;
  asDrawer: boolean;
  backHref: string;
  initialDate?: string;
  initialTime?: string;
  fromDragDrop?: boolean;
};

function toDateInput(timestamp: number) {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTimeInput(timestamp: number) {
  const date = new Date(timestamp);
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(timestamp));
}

function formatDatePickerLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
  }).format(date);
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

function buildMailtoHref({ to, subject, body }: { to: string; subject: string; body: string }) {
  const params = new URLSearchParams({
    subject,
    body,
  });
  return `mailto:${to}?${params.toString()}`;
}

function formatLocationLabel(location: ReservationActionData["location"]) {
  if (location === "fortaleza") {
    return "Fortaleza";
  }
  if (location === "sao_domingos_do_maranhao") {
    return "São Domingos do Maranhão";
  }
  return "Fortuna";
}

function parseDateInput(value?: string) {
  if (!value) {
    return null;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isValidTimeInput(value?: string) {
  return Boolean(value && /^\d{2}:\d{2}$/.test(value));
}

function ReservationActionContent({
  mode,
  reservation,
  initialDate,
  initialTime,
  fromDragDrop,
}: {
  mode: ReservationActionMode;
  reservation: ReservationActionData;
  initialDate?: string;
  initialTime?: string;
  fromDragDrop?: boolean;
}) {
  const cancelFormId = useId();
  const rescheduleFormId = useId();
  const [rescheduleDate, setRescheduleDate] = useState<Date>(() => parseDateInput(initialDate) ?? new Date(reservation.startsAt));
  const defaultRescheduleTime = isValidTimeInput(initialTime) ? initialTime : toTimeInput(reservation.startsAt);
  const modeTitle =
    mode === "reagendar"
      ? "Reagendar e atualizar"
      : mode === "status"
        ? "Atualização de status"
        : mode === "cancelar"
          ? "Cancelar agendamento"
          : "Contato com paciente";
  const modeDescription =
    mode === "reagendar"
      ? "Ajuste data, horário e observações da reserva."
      : mode === "status"
        ? "Atualize rapidamente a etapa do atendimento."
        : mode === "cancelar"
          ? "Confirme o cancelamento com notificação por e-mail."
          : "Acesse os canais de comunicação da pessoa paciente.";
  const operationalTags = [
    reservation.eventKind,
    reservationStatusLabel[reservation.status],
    formatLocationLabel(reservation.location),
    reservation.patientEmail ? "Com e-mail" : "Sem e-mail",
    reservation.patientPhone ? "Com telefone" : "Sem telefone",
  ];
  const reminder24hBody = `Olá${reservation.patientName ? `, ${reservation.patientName}` : ""}!

Este é um lembrete da sua consulta de ${reservation.eventTypeTitle}.
Data e horário: ${formatDateTime(reservation.startsAt)}.
Unidade: ${formatLocationLabel(reservation.location)}.

Se precisar reagendar, responda este e-mail com antecedência.

Atenciosamente,
Equipe de atendimento`;
  const confirmationBody = `Olá${reservation.patientName ? `, ${reservation.patientName}` : ""}!

Seu agendamento está confirmado:
- Atendimento: ${reservation.eventTypeTitle}
- Data e horário: ${formatDateTime(reservation.startsAt)}
- Unidade: ${formatLocationLabel(reservation.location)}

Qualquer dúvida, estamos à disposição.

Atenciosamente,
Equipe de atendimento`;

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3 text-sm">
        <p className="font-medium">{reservation.eventTypeTitle}</p>
        <p className="text-muted-foreground">{formatDateTime(reservation.startsAt)}</p>
        <p className="text-muted-foreground">
          {reservation.patientName ?? "Paciente"} ({reservation.clerkUserId})
        </p>
        <p className="text-muted-foreground">Telefone: {reservation.patientPhone ?? "Não informado"}</p>
        <p className="text-muted-foreground">
          Nascimento: {formatBirthDateLabel(reservation.patientBirthDate)}
        </p>
        <p className="text-muted-foreground">Última atualização: {formatDateTime(reservation.updatedAt)}</p>
        <div className="mt-2">
          <Badge variant={reservationStatusBadgeVariant[reservation.status]}>
            {reservationStatusLabel[reservation.status]}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {operationalTags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>

      <div>
        <p className="text-sm font-medium">{modeTitle}</p>
        <p className="text-xs text-muted-foreground">{modeDescription}</p>
      </div>

      {mode === "contato" ? (
        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm text-muted-foreground">
            {reservation.patientEmail || reservation.patientPhone
              ? "Use os atalhos para entrar em contato."
              : "Nenhum contato cadastrado para esta reserva."}
          </p>
          <div className="grid gap-2">
            {reservation.patientPhone ? (
              <>
                <Button variant="outline" asChild>
                  <a href={`tel:${reservation.patientPhone}`}>Ligar</a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={`https://wa.me/${normalizePhoneForWhatsapp(reservation.patientPhone)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir no WhatsApp
                  </a>
                </Button>
              </>
            ) : null}
            {reservation.patientEmail ? (
              <Button variant="outline" asChild>
                <a href={`mailto:${reservation.patientEmail}`}>E-mail</a>
              </Button>
            ) : null}
          </div>
          {reservation.patientEmail ? (
            <div className="grid gap-2 rounded-md border bg-muted/30 p-2">
              <p className="text-xs font-medium text-muted-foreground">Notificações prontas por e-mail</p>
              <Button variant="outline" asChild>
                <a
                  href={buildMailtoHref({
                    to: reservation.patientEmail,
                    subject: "Lembrete da sua consulta",
                    body: reminder24hBody,
                  })}
                >
                  Lembrete 24h
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={buildMailtoHref({
                    to: reservation.patientEmail,
                    subject: "Confirmação de agendamento",
                    body: confirmationBody,
                  })}
                >
                  Confirmação de horário
                </a>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "reagendar" ? (
        <form id={rescheduleFormId} action={updateReservationAction} className="grid gap-2 rounded-md border p-3">
          <input type="hidden" name="reservationId" value={reservation._id} />
          <input type="hidden" name="clerkUserId" value={reservation.clerkUserId} />
          <input type="hidden" name="eventTypeId" value={reservation.eventTypeId} />
          <input type="hidden" name="availabilityId" value={reservation.availabilityId} />
          <input type="hidden" name="notifyEmail" value={reservation.patientEmail ?? ""} />
          <input type="hidden" name="notifyName" value={reservation.patientName ?? ""} />
          <input type="hidden" name="eventTypeTitle" value={reservation.eventTypeTitle} />
          <input name="date" type="hidden" value={toDateInput(rescheduleDate.getTime())} />
          {fromDragDrop ? (
            <p className="rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-xs text-muted-foreground">
              Novo horário selecionado via arrastar e soltar. Revise os dados e confirme para concluir o reagendamento.
            </p>
          ) : null}
          <div className="grid gap-1">
            <p className="text-xs font-medium text-muted-foreground">Data</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("justify-start text-left font-normal")}
                >
                  <CalendarIcon className="size-4" />
                  <span>{formatDatePickerLabel(rescheduleDate)}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={ptBR}
                  selected={rescheduleDate}
                  onSelect={(value) => {
                    if (value) {
                      setRescheduleDate(value);
                    }
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Input name="time" type="time" defaultValue={defaultRescheduleTime} required />
          <select
            name="status"
            className="h-9 rounded-md border border-input bg-input/20 px-2 text-sm"
            defaultValue={reservation.status}
          >
            <option value="pending">Pendente</option>
            <option value="awaiting_patient">Aguardando paciente</option>
            <option value="confirmed">Confirmado</option>
            <option value="in_care">Em atendimento</option>
            <option value="surgery_planned">Cirurgia planejada</option>
            <option value="postop_followup">Pós-operatório</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
            <option value="no_show">Não compareceu</option>
          </select>
          <Textarea name="notes" defaultValue={reservation.notes ?? ""} placeholder="Observações administrativas" />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button">Confirmar reagendamento</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar reagendamento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ao confirmar, a reserva será atualizada para o novo horário e um e-mail será enviado para{" "}
                  {reservation.patientEmail ? reservation.patientEmail : "a pessoa paciente, caso exista e-mail cadastrado"}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction form={rescheduleFormId} type="submit">
                  Confirmar e enviar notificação
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </form>
      ) : null}

      {mode === "status" ? (
        <form action={setReservationStatusAction} className="grid gap-2 rounded-md border p-3">
          <input type="hidden" name="reservationId" value={reservation._id} />
          <input type="hidden" name="notifyEmail" value={reservation.patientEmail ?? ""} />
          <input type="hidden" name="notifyName" value={reservation.patientName ?? ""} />
          <input type="hidden" name="eventTypeTitle" value={reservation.eventTypeTitle} />
          <input type="hidden" name="scheduledAt" value={String(reservation.startsAt)} />
          <select
            name="status"
            className="h-9 rounded-md border border-input bg-input/20 px-2 text-sm"
            defaultValue={reservation.status}
          >
            <option value="pending">Pendente</option>
            <option value="awaiting_patient">Aguardando paciente</option>
            <option value="confirmed">Confirmado</option>
            <option value="in_care">Em atendimento</option>
            <option value="surgery_planned">Cirurgia planejada</option>
            <option value="postop_followup">Pós-operatório</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
            <option value="no_show">Não compareceu</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Se o horário já tiver passado, status pendente, aguardando paciente ou confirmado será convertido
            automaticamente para no_show.
          </p>
          <Textarea name="notes" placeholder="Observação opcional para o histórico" />
          <Button type="submit">Confirmar atualização</Button>
        </form>
      ) : null}

      {mode === "cancelar" ? (
        <form
          id={cancelFormId}
          action={setReservationStatusAction}
          className="rounded-md border border-destructive/40 p-3"
        >
          <input type="hidden" name="reservationId" value={reservation._id} />
          <input type="hidden" name="status" value="cancelled" />
          <input type="hidden" name="notes" value="Cancelada pelo admin no painel de reservas." />
          <input type="hidden" name="notifyEmail" value={reservation.patientEmail ?? ""} />
          <input type="hidden" name="notifyName" value={reservation.patientName ?? ""} />
          <input type="hidden" name="eventTypeTitle" value={reservation.eventTypeTitle} />
          <input type="hidden" name="scheduledAt" value={String(reservation.startsAt)} />
          {reservation.status === "cancelled" ? (
            <p className="text-sm text-muted-foreground">Esta reserva já está cancelada.</p>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive">
                  Confirmar cancelamento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar cancelamento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação atualiza o status para cancelado e envia e-mail para a pessoa paciente quando houver
                    endereço cadastrado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                  <AlertDialogAction form={cancelFormId} type="submit">
                    Cancelar agendamento
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </form>
      ) : null}

      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">Últimos registros de notificações e status</p>
        {reservation.recentTimeline.length > 0 ? (
          <div className="space-y-2">
            {reservation.recentTimeline.map((event) => (
              <div key={event.id} className="rounded-md border bg-muted/20 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                </div>
                <p className="text-xs text-muted-foreground">{event.notes || "Sem observações registradas."}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Ainda não há registros para esta reserva.</p>
        )}
      </div>
    </div>
  );
}

export function AdminReservationActionView({
  mode,
  reservation,
  asDrawer,
  backHref,
  initialDate,
  initialTime,
  fromDragDrop,
}: AdminReservationActionViewProps) {
  const router = useRouter();
  const handleBack = () => closeParallelRoute(router, backHref);

  if (asDrawer) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) {
            closeParallelRoute(router, backHref);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gestão da reserva</DialogTitle>
            <DialogDescription>Use ações rápidas sem sair da lista de reservas.</DialogDescription>
          </DialogHeader>
          <div>
            <ReservationActionContent
              mode={mode}
              reservation={reservation}
              initialDate={initialDate}
              initialTime={initialTime}
              fromDragDrop={fromDragDrop}
            />
          </div>
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleBack}>
              Voltar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <Card variant="flat-mobile" className="border-border/70">
        <CardHeader>
          <CardTitle>Gestão da reserva</CardTitle>
          <CardDescription>Visualização direta da ação selecionada.</CardDescription>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={handleBack}>
              Voltar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ReservationActionContent
            mode={mode}
            reservation={reservation}
            initialDate={initialDate}
            initialTime={initialTime}
            fromDragDrop={fromDragDrop}
          />
        </CardContent>
      </Card>
    </div>
  );
}
