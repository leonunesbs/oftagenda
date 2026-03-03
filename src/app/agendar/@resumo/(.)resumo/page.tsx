"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { StartCheckoutButton } from "@/components/start-checkout-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ResumoInterceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const location = searchParams.get("location") ?? "";
  const locationLabelFromParams = searchParams.get("locationLabel") ?? "";
  const date = searchParams.get("date") ?? "";
  const time = searchParams.get("time") ?? "";

  const locationLabel = locationLabelFromParams || location || "Local nao informado";
  const dateLabel = date ? formatDateLabel(date) : "Data nao informada";
  const timeLabel = time || "Horario nao informado";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          router.back();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resumo do agendamento</DialogTitle>
          <DialogDescription>
            Confira os dados selecionados antes de confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
          <p>
            <span className="font-medium text-foreground">Local:</span> {locationLabel}
          </p>
          <p>
            <span className="font-medium text-foreground">Data:</span> {dateLabel}
          </p>
          <p>
            <span className="font-medium text-foreground">Horario:</span> {timeLabel}
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Editar agendamento
          </Button>
          <StartCheckoutButton
            location={location}
            date={date}
            time={time}
            label="Seguir para pagamento"
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!day || !month || !year) {
    return isoDate;
  }
  return `${day}/${month}/${year}`;
}
