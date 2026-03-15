"use client";

import { useState } from "react";
import { AdminCreateAppointmentForm } from "@/components/admin-create-appointment-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

        <AdminCreateAppointmentForm
          eventTypes={eventTypes}
          availabilityGroups={availabilityGroups}
          initialDate={initialDate}
          initialTime={initialTime}
        />
      </DialogContent>
    </Dialog>
  );
}
