"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
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
import type {
  BookingLocationOption,
  LocationAvailabilityResponse,
} from "@/lib/booking-bootstrap";

type ReschedulePolicy = {
  canReschedule: boolean;
  canCancel: boolean;
  cancelReason: string | null;
  requiresHumanSupport: boolean;
  reason: string | null;
  maxReschedules: number;
  reschedulesUsed: number;
  minNoticeHours: number;
  maxDaysAhead: number;
};

type RescheduleAppointmentCardProps = {
  policy: ReschedulePolicy;
  locations: BookingLocationOption[];
  availabilityByLocation: Record<string, LocationAvailabilityResponse>;
  availabilityErrorsByLocation: Record<string, string>;
  initialLocation?: string;
};

export function RescheduleAppointmentCard({
  policy,
  locations,
  availabilityByLocation,
  availabilityErrorsByLocation,
  initialLocation = "",
}: RescheduleAppointmentCardProps) {
  const router = useRouter();
  const defaultLocation =
    locations.find((item) => item.value === initialLocation)?.value ?? locations[0]?.value ?? "";
  const [location, setLocation] = useState(defaultLocation);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const availability = location ? availabilityByLocation[location] : undefined;
  const availabilityError = location ? availabilityErrorsByLocation[location] : undefined;
  const dateOptions = availability?.dates ?? [];
  const selectedDateOption =
    dateOptions.find((item) => item.isoDate === selectedDate) ?? null;
  const timeOptions = selectedDateOption?.times ?? [];
  const canSubmit = Boolean(policy.canReschedule && location && selectedDate && selectedTime);

  const policyText = useMemo(
    () =>
      `1 remarcação sem custo, até ${policy.maxDaysAhead} dias e com mínimo de ${policy.minNoticeHours}h de antecedência. Cancelamentos também podem ser feitos até ${policy.minNoticeHours}h antes.`,
    [policy.maxDaysAhead, policy.minNoticeHours],
  );

  function handleLocationChange(nextLocation: string) {
    setLocation(nextLocation);
    setSelectedDate("");
    setSelectedTime("");
    setError(null);
    setSuccess(null);
  }

  function handleDateChange(nextDate: string) {
    setSelectedDate(nextDate);
    setSelectedTime("");
    setError(null);
    setSuccess(null);
  }

  function handleSubmit() {
    if (isPending) {
      return;
    }
    if (!canSubmit) {
      setError("Selecione local, data e horário para continuar.");
      return;
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/appointments/reschedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location,
            date: selectedDate,
            time: selectedTime,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error ?? "Não foi possível remarcar a consulta.");
        }
        setSuccess("Consulta remarcada com sucesso.");
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Falha ao remarcar consulta.",
        );
      }
    });
  }

  function handleCancelAppointment() {
    if (isPending) {
      return;
    }
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/appointments/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error ?? "Não foi possível cancelar a consulta.");
        }
        setSuccess(
          "Consulta cancelada com sucesso. Você já pode iniciar uma nova reserva do zero.",
        );
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Falha ao cancelar consulta.",
        );
      }
    });
  }

  return (
    <section id="remarcacao-consulta" className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="font-medium">Remarcação facilitada</h3>
      <p className="text-sm text-muted-foreground">{policyText}</p>
      <p className="text-xs text-muted-foreground">
        Remarcações utilizadas: {policy.reschedulesUsed}/{policy.maxReschedules}
      </p>
      <p className="text-xs text-muted-foreground">
        A taxa de reserva de 20% entra como sinal e abate 20% do valor da
        consulta, restando 80% para pagamento no atendimento. Após a remarcação
        gratuita, novas remarcações exigem nova taxa de 20%, sem abatimento.
      </p>
      <p className="text-xs text-muted-foreground">
        Cancelamentos com mais de 24h de antecedência têm reembolso integral da
        taxa de reserva.
      </p>
      <p className="text-xs text-muted-foreground">
        Em caso de não comparecimento, a taxa de reserva é retida, o agendamento
        é cancelado como no-show e uma nova reserva deverá ser iniciada.
      </p>

      {!policy.canReschedule ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          {policy.reason ?? "Sua consulta não está elegível para remarcação automática."}
        </div>
      ) : null}
      {!policy.canCancel && policy.cancelReason ? (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          {policy.cancelReason}
        </div>
      ) : null}

      {policy.requiresHumanSupport ? (
        <div className="space-y-2 rounded-md border border-border/70 bg-muted/20 p-3">
          <p className="text-sm text-muted-foreground">
            Para consultas com menos de {policy.minNoticeHours}h, o cancelamento e
            a remarcação automáticos ficam bloqueados. Continue pelo WhatsApp.
          </p>
          <Button asChild variant="secondary" size="sm">
            <a
              href="https://wa.me/5585999853811?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20cancelamento%20ou%20remarca%C3%A7%C3%A3o%20da%20minha%20consulta."
              target="_blank"
              rel="noreferrer"
            >
              Falar no WhatsApp
            </a>
          </Button>
        </div>
      ) : null}

      {!policy.requiresHumanSupport ? (
        <>
      <div className="space-y-2">
        <p className="text-sm font-medium">1. Local</p>
        <div className="flex flex-wrap gap-2">
          {locations.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={location === item.value ? "default" : "outline"}
              onClick={() => handleLocationChange(item.value)}
              disabled={!policy.canReschedule || isPending}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">2. Data</p>
        {availabilityError ? (
          <p className="text-sm text-destructive">{availabilityError}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {dateOptions.slice(0, 12).map((item) => (
            <Button
              key={item.isoDate}
              type="button"
              variant={selectedDate === item.isoDate ? "default" : "outline"}
              onClick={() => handleDateChange(item.isoDate)}
              disabled={!policy.canReschedule || isPending}
            >
              {item.weekdayLabel}, {item.label}
            </Button>
          ))}
        </div>
        {dateOptions.length === 0 && !availabilityError ? (
          <p className="text-sm text-muted-foreground">Sem datas disponíveis para este local.</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">3. Horário</p>
        <div className="flex flex-wrap gap-2">
          {timeOptions.map((slot) => (
            <Button
              key={slot}
              type="button"
              variant={selectedTime === slot ? "default" : "outline"}
              onClick={() => setSelectedTime(slot)}
              disabled={!policy.canReschedule || isPending}
            >
              {slot}
            </Button>
          ))}
        </div>
        {selectedDate && timeOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem horários para a data selecionada.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <AlertDialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" disabled={!canSubmit || isPending}>
              {isPending ? "Remarcando..." : "Remarcar consulta"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar remarcação?</AlertDialogTitle>
              <AlertDialogDescription>
                Sua consulta atual será substituída por este novo horário.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setIsRescheduleDialogOpen(false);
                  handleSubmit();
                }}
              >
                Confirmar remarcação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline" disabled={isPending || !policy.canCancel}>
              Cancelar consulta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar cancelamento?</AlertDialogTitle>
              <AlertDialogDescription>
                Você poderá cancelar somente com antecedência mínima de 24h.
                Após o cancelamento, será necessário iniciar uma nova reserva.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setIsCancelDialogOpen(false);
                  handleCancelAppointment();
                }}
              >
                Confirmar cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
        </>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{success}</p> : null}
    </section>
  );
}
