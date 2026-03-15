"use client";

import { AdminCreateAppointmentForm } from "@/components/admin-create-appointment-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { closeParallelRoute } from "@/lib/parallel-route-navigation";
import { useRouter } from "next/navigation";

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

type AdminCreateAppointmentViewProps = {
  eventTypes: EventTypeOption[];
  availabilityGroups: AvailabilityGroupOption[];
  initialDate?: string;
  initialTime?: string;
  asDrawer: boolean;
  backHref: string;
};

export function AdminCreateAppointmentView({
  eventTypes,
  availabilityGroups,
  initialDate,
  initialTime,
  asDrawer,
  backHref,
}: AdminCreateAppointmentViewProps) {
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
        <DialogContent className="max-h-[90vh] w-full overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar agendamento manual</DialogTitle>
            <DialogDescription>
              Agende consulta, exame ou procedimento em nome do paciente com preenchimento assistido.
            </DialogDescription>
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

  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <Card variant="flat-mobile" className="border-border/70">
        <CardHeader>
          <CardTitle>Criar agendamento manual</CardTitle>
          <CardDescription>
            Agende consulta, exame ou procedimento em nome do paciente com preenchimento assistido.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminCreateAppointmentForm
            eventTypes={eventTypes}
            availabilityGroups={availabilityGroups}
            initialDate={initialDate}
            initialTime={initialTime}
          />
        </CardContent>
      </Card>
    </div>
  );
}
