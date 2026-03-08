"use client";

import { useMemo, useState } from "react";
import { adminCreateAppointmentAction } from "@/app/dashboard/admin/actions";
import { Button } from "@/components/ui/button";
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

type AdminCreateAppointmentDialogProps = {
  eventTypes: EventTypeOption[];
  availabilityGroups: AvailabilityGroupOption[];
  triggerLabel?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialDate?: string;
  initialTime?: string;
};

const selectClassName = "h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs";

export function AdminCreateAppointmentDialog({
  eventTypes,
  availabilityGroups,
  triggerLabel = "Novo agendamento",
  open,
  onOpenChange,
  initialDate,
  initialTime,
}: AdminCreateAppointmentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const activeEventTypes = eventTypes.filter((eventType) => eventType.active);
  const defaultEventTypeId = activeEventTypes[0]?._id ?? "";
  const defaultAvailabilityId =
    activeEventTypes[0]?.availabilityId ?? availabilityGroups[0]?.representativeId ?? "";
  const defaultDate = initialDate ?? "";
  const defaultTime = initialTime ?? "";

  const eventTypeOptions = useMemo(
    () =>
      activeEventTypes.map((eventType) => ({
        value: eventType._id,
        label: eventType.name ?? eventType.title,
        kind: eventType.kind ?? "consulta",
      })),
    [activeEventTypes],
  );

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {triggerLabel ? (
        <DialogTrigger asChild>
          <Button>{triggerLabel}</Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar agendamento manual</DialogTitle>
          <DialogDescription>Agende consulta, exame ou procedimento em nome do paciente.</DialogDescription>
        </DialogHeader>

        <form action={adminCreateAppointmentAction} className="grid gap-3" key={`${defaultDate}-${defaultTime}`}>
          <div className="grid gap-1.5">
            <Label htmlFor="create-clerkUserId">Clerk User ID (opcional)</Label>
            <Input id="create-clerkUserId" name="clerkUserId" placeholder="user_..." />
          </div>

          <div className="grid gap-1.5 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="create-name">Nome</Label>
              <Input id="create-name" name="name" required placeholder="Nome do paciente" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="create-phone">Telefone</Label>
              <Input id="create-phone" name="phone" required placeholder="(99) 99999-9999" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="create-email">E-mail</Label>
            <Input id="create-email" name="email" required type="email" placeholder="paciente@email.com" />
          </div>

          <div className="grid gap-1.5 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="create-eventType">Tipo de atendimento</Label>
              <select id="create-eventType" name="eventTypeId" className={selectClassName} defaultValue={defaultEventTypeId} required>
                {eventTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} ({option.kind})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="create-availability">Grupo de disponibilidade</Label>
              <select
                id="create-availability"
                name="availabilityId"
                className={selectClassName}
                defaultValue={defaultAvailabilityId}
                required
              >
                {availabilityGroups.map((group) => (
                  <option key={group.representativeId} value={group.representativeId}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-1.5 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="create-date">Data</Label>
              <Input id="create-date" name="date" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="create-time">Horario</Label>
              <Input id="create-time" name="time" type="time" defaultValue={defaultTime} required />
            </div>
          </div>

          <div className="grid gap-1.5 md:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="create-preferredPeriod">Periodo preferencial</Label>
              <select id="create-preferredPeriod" name="preferredPeriod" className={selectClassName} defaultValue="qualquer">
                <option value="manha">manha</option>
                <option value="tarde">tarde</option>
                <option value="noite">noite</option>
                <option value="qualquer">qualquer</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="create-reason">Motivo (opcional)</Label>
              <Input id="create-reason" name="reason" placeholder="Queixa principal" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="create-notes">Observacoes internas</Label>
            <Textarea id="create-notes" name="notes" placeholder="Informacoes adicionais da equipe" />
          </div>

          <Button type="submit">Confirmar agendamento</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
