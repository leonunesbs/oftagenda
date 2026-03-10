"use client";

import { useRouter } from "next/navigation";

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

type ResumoDialogProps = {
  locationId: string;
  locationLabel: string;
  locationAddress: string;
  date: string;
  dateLabel: string;
  time: string;
  timeLabel: string;
  payment: string;
  hasRedactedParams: boolean;
  hasInvalidSelection: boolean;
  isAuthenticated: boolean;
};

export function ResumoDialog({
  locationId,
  locationLabel,
  locationAddress,
  date,
  dateLabel,
  time,
  timeLabel,
  payment,
  hasRedactedParams,
  hasInvalidSelection,
  isAuthenticated,
}: ResumoDialogProps) {
  const router = useRouter();
  const checkoutNotCompleted = payment === "cancelled";
  const hasError = hasRedactedParams || hasInvalidSelection;
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
          <DialogTitle>
            {hasError ? "Erro ao carregar agendamento" : "Resumo do agendamento"}
          </DialogTitle>
          <DialogDescription>
            {hasRedactedParams
              ? "Detectamos dados inválidos na URL. Por segurança, inicie um novo agendamento."
              : checkoutNotCompleted
                ? "Você não concluiu o checkout. Esse horário foi liberado e pode já ter sido reservado. Escolha um novo horário."
              : hasInvalidSelection
                ? "Esse horário não está mais disponível para o local selecionado. Escolha um novo horário."
                : "Confira os dados selecionados antes de confirmar."}
          </DialogDescription>
        </DialogHeader>

        {hasError ? (
          <p className="text-sm text-destructive">
            {hasRedactedParams
              ? "Não foi possível validar os dados deste resumo."
              : checkoutNotCompleted
                ? "Você saiu do checkout sem concluir o pagamento. Inicie um novo agendamento para escolher outro horário."
                : "Não foi possível validar os dados deste resumo."}
          </p>
        ) : (
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
            <p>
              <span className="font-medium text-foreground">Local:</span>{" "}
              {locationLabel}
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
              <span className="font-medium text-foreground">Data:</span>{" "}
              {dateLabel}
            </p>
            <p>
              <span className="font-medium text-foreground">Horário:</span>{" "}
              {timeLabel}
            </p>
            {checkoutNotCompleted ? (
              <p className="mt-2 text-destructive">
                Você saiu do checkout sem concluir o pagamento. Para confirmar a
                consulta, inicie uma nova tentativa.
              </p>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {hasError ? (
            <Button type="button" onClick={() => router.push("/agendar")}>
              Fazer novo agendamento
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Editar agendamento
              </Button>
              <StartCheckoutButton
                location={locationId}
                date={date}
                time={time}
                label="Seguir para pagamento"
                isAuthenticated={isAuthenticated}
              />
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildAddressHref(address: string) {
  return `geo:0,0?q=${encodeURIComponent(address)}`;
}
