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
  const hasRedactedParams = [location, locationLabelFromParams, locationAddress, date, time].some(
    isRedactedValue,
  );

  const locationLabel = locationLabelFromParams || location || "Local não informado";
  const dateLabel = date ? formatDateLabel(date) : "Data não informada";
  const timeLabel = time || "Horário não informado";
  const addressHref = locationAddress ? buildAddressHref(locationAddress) : "";

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
          <DialogTitle>{hasRedactedParams ? "Erro ao carregar agendamento" : "Resumo do agendamento"}</DialogTitle>
          <DialogDescription>
            {hasRedactedParams
              ? "Detectamos dados inválidos na URL. Por segurança, inicie um novo agendamento."
              : "Confira os dados selecionados antes de confirmar."}
          </DialogDescription>
        </DialogHeader>

        {hasRedactedParams ? (
          <p className="text-sm text-destructive">
            Não foi possível validar os dados deste resumo.
          </p>
        ) : (
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
            <p>
              <span className="font-medium text-foreground">Local:</span> {locationLabel}
            </p>
            {locationAddress ? (
              <p>
                <span className="font-medium text-foreground">Endereço:</span>{" "}
                <a
                  href={addressHref}
                  className="underline underline-offset-4 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={`Abrir o endereço em um aplicativo de mapas: ${locationAddress}`}
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
        )}

        <DialogFooter>
          {hasRedactedParams ? (
            <Button type="button" onClick={() => router.push("/agendar")}>
              Fazer novo agendamento
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Editar agendamento
              </Button>
              <StartCheckoutButton
                location={location}
                date={date}
                time={time}
                label="Seguir para pagamento"
              />
            </>
          )}
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

function buildAddressHref(address: string) {
  return `geo:0,0?q=${encodeURIComponent(address)}`;
}

function isRedactedValue(value: string) {
  return /(?:\[)?redacted(?:\])?/i.test(value.trim());
}
