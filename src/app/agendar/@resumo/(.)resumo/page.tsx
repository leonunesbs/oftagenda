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
  const locationAddress = searchParams.get("locationAddress") ?? "";
  const date = searchParams.get("date") ?? "";
  const time = searchParams.get("time") ?? "";

  const locationLabel = locationLabelFromParams || location || "Local nao informado";
  const dateLabel = date ? formatDateLabel(date) : "Data nao informada";
  const timeLabel = time || "Horário nao informado";
  const mapsHref = locationAddress ? buildMapsDirectionsUrl(locationAddress) : "";

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
          {locationAddress ? (
            <p>
              <span className="font-medium text-foreground">Endereco:</span>{" "}
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`Abrir rotas no mapa para ${locationAddress}`}
              >
                {locationAddress}
              </a>
            </p>
          ) : null}
          <p>
            <span className="font-medium text-foreground">Data:</span> {dateLabel}
          </p>
          <p>
            <span className="font-medium text-foreground">Horário:</span> {timeLabel}
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

function buildMapsDirectionsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
