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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { closeParallelRoute } from "@/lib/parallel-route-navigation";
import { useRouter } from "next/navigation";

type ReservationStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

type ReservationActionMode = "reagendar" | "status" | "cancelar" | "contato";

type ReservationActionData = {
  _id: string;
  clerkUserId: string;
  eventTypeId: string;
  availabilityId: string;
  eventTypeTitle: string;
  availabilityLabel: string;
  status: ReservationStatus;
  startsAt: number;
  notes?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
};

type AdminReservationActionViewProps = {
  mode: ReservationActionMode;
  reservation: ReservationActionData;
  asDrawer: boolean;
  backHref: string;
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

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const STATUS_BADGE_VARIANT: Record<ReservationStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  completed: "outline",
  cancelled: "destructive",
  no_show: "destructive",
};

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

function ReservationActionContent({
  mode,
  reservation,
}: {
  mode: ReservationActionMode;
  reservation: ReservationActionData;
}) {
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

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-3 text-sm">
        <p className="font-medium">{reservation.eventTypeTitle}</p>
        <p className="text-muted-foreground">{formatDateTime(reservation.startsAt)}</p>
        <p className="text-muted-foreground">
          {reservation.patientName ?? "Paciente"} ({reservation.clerkUserId})
        </p>
        <div className="mt-2">
          <Badge variant={STATUS_BADGE_VARIANT[reservation.status]}>{STATUS_LABEL[reservation.status]}</Badge>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium">{modeTitle}</p>
        <p className="text-xs text-muted-foreground">{modeDescription}</p>
      </div>

      {mode === "contato" ? (
        <div className="space-y-2 rounded-md border p-3">
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
                    WhatsApp
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
        </div>
      ) : null}

      {mode === "reagendar" ? (
        <form action={updateReservationAction} className="grid gap-2 rounded-md border p-3">
          <input type="hidden" name="reservationId" value={reservation._id} />
          <input type="hidden" name="clerkUserId" value={reservation.clerkUserId} />
          <input type="hidden" name="eventTypeId" value={reservation.eventTypeId} />
          <input type="hidden" name="availabilityId" value={reservation.availabilityId} />
          <input type="hidden" name="notifyEmail" value={reservation.patientEmail ?? ""} />
          <input type="hidden" name="notifyName" value={reservation.patientName ?? ""} />
          <input type="hidden" name="eventTypeTitle" value={reservation.eventTypeTitle} />
          <Input name="date" type="date" defaultValue={toDateInput(reservation.startsAt)} required />
          <Input name="time" type="time" defaultValue={toTimeInput(reservation.startsAt)} required />
          <select
            name="status"
            className="h-9 rounded-md border border-input bg-input/20 px-2 text-sm"
            defaultValue={reservation.status}
          >
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
            <option value="no_show">Não compareceu</option>
          </select>
          <Textarea name="notes" defaultValue={reservation.notes ?? ""} placeholder="Observações administrativas" />
          <Button type="submit">Salvar alterações</Button>
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
            <option value="confirmed">Confirmado</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
            <option value="no_show">Não compareceu</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Se o horário já tiver passado, status pendente ou confirmado será convertido automaticamente para no_show.
          </p>
          <Textarea name="notes" placeholder="Observação opcional para o histórico" />
          <Button type="submit">Confirmar atualização</Button>
        </form>
      ) : null}

      {mode === "cancelar" ? (
        <form action={setReservationStatusAction} className="rounded-md border border-destructive/40 p-3">
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
                  <AlertDialogAction type="submit">Cancelar agendamento</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </form>
      ) : null}
    </div>
  );
}

export function AdminReservationActionView({
  mode,
  reservation,
  asDrawer,
  backHref,
}: AdminReservationActionViewProps) {
  const router = useRouter();

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
            <ReservationActionContent mode={mode} reservation={reservation} />
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
        </CardHeader>
        <CardContent>
          <ReservationActionContent mode={mode} reservation={reservation} />
        </CardContent>
      </Card>
    </div>
  );
}
