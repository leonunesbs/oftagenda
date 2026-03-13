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
  consultationPriceCents: number;
  reservationFeeCents: number;
  reservationFeePercent: number;
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
  consultationPriceCents,
  reservationFeeCents,
  reservationFeePercent,
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
  const remainingAtConsultationCents = Math.max(
    consultationPriceCents - reservationFeeCents,
    0,
  );

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
            {hasError
              ? "Erro ao carregar agendamento"
              : "Resumo do agendamento"}
          </DialogTitle>
          <DialogDescription>
            {hasRedactedParams
              ? "Detectamos dados inválidos na URL. Por segurança, inicie um novo agendamento."
              : checkoutNotCompleted
                ? "Você não concluiu o checkout da taxa de reserva. Esse horário foi liberado e pode já ter sido reservado. Escolha um novo horário."
                : hasInvalidSelection
                  ? "Esse horário não está mais disponível para o local selecionado. Escolha um novo horário."
                  : "Confira os dados selecionados antes de seguir para o pagamento da taxa de reserva."}
          </DialogDescription>
        </DialogHeader>

        {hasError ? (
          <p className="text-sm text-destructive">
            {hasRedactedParams
              ? "Não foi possível validar os dados deste resumo."
              : checkoutNotCompleted
                ? "Você saiu do checkout sem concluir o pagamento da taxa de reserva. Inicie um novo agendamento para escolher outro horário."
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
            <p className="mt-2 font-medium text-foreground">Resumo financeiro</p>
            <p className="text-muted-foreground">
              Visualize os valores do checkout antes de pagar.
            </p>
            <div className="mt-2 space-y-3 rounded-lg border border-border/60 bg-background/60 p-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">Consulta oftalmológica</p>
                  <p className="font-medium text-foreground">
                    {formatConsultationPrice(consultationPriceCents)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor total da consulta.
                </p>
              </div>
              <div className="h-px w-full bg-border/70" />
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">
                    Taxa de reserva (pago agora)
                  </p>
                  <p className="font-medium text-foreground">
                    {formatReservationFee(reservationFeeCents)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pagamento online para confirmar a reserva.
                </p>
              </div>
              <div className="h-px w-full bg-border/70" />
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-foreground">
                    Pagamento na consulta (presencial)
                  </p>
                  <p className="font-medium text-foreground">
                    {formatRemainingAtConsultation(
                      consultationPriceCents,
                      remainingAtConsultationCents,
                    )}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Valor restante para pagamento presencial no dia da consulta.
                </p>
              </div>
            </div>
            {checkoutNotCompleted ? (
              <p className="mt-2 text-destructive">
                Você saiu do checkout sem concluir o pagamento da taxa de
                reserva. Para confirmar a intenção de reserva, inicie uma nova
                tentativa.
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
                label="Pagar taxa de reserva"
                isAuthenticated={isAuthenticated}
                reservationAmountCents={reservationFeeCents}
                consultationAmountCents={consultationPriceCents}
                reservationFeePercent={reservationFeePercent}
              />
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function buildAddressHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents || 0) / 100);
}

function formatReservationFee(cents: number) {
  if (cents <= 0) {
    return "Cobrada no checkout de confirmação.";
  }

  return formatMoney(cents);
}

function formatConsultationPrice(cents: number) {
  if (cents <= 0) {
    return "A confirmar";
  }

  return formatMoney(cents);
}

function formatRemainingAtConsultation(totalCents: number, remainingCents: number) {
  if (totalCents <= 0) {
    return "A confirmar";
  }

  return formatMoney(remainingCents);
}
