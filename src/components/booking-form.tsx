"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useMemo, useState } from "react";

import type { BookingPayload } from "@/domain/booking/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { bookingSchema } from "@/domain/booking/schema";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { useRouter } from "next/navigation";

const locations: Array<{
  value: BookingPayload["location"];
  label: string;
  amountCents: number;
}> = [
  { value: "fortaleza", label: "Fortaleza", amountCents: 12000 },
  {
    value: "sao_domingos_do_maranhao",
    label: "São Domingos do Maranhão",
    amountCents: 10000,
  },
  { value: "fortuna", label: "Fortuna", amountCents: 9000 },
];

type LocationAvailabilityDate = {
  isoDate: string;
  label: string;
  weekdayLabel: string;
  times: string[];
};

type LocationAvailabilityResponse = {
  location: BookingPayload["location"];
  dates: LocationAvailabilityDate[];
};

type BookingFormProps = {
  isAuthenticated: boolean;
  clerkEnabled: boolean;
};

export function BookingForm({
  isAuthenticated,
  clerkEnabled,
}: BookingFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState<BookingPayload["location"] | "">("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] =
    useState<LocationAvailabilityResponse | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  const selectedLocation = locations.find((item) => item.value === location);
  const hasLocation = Boolean(location);
  const availableDates = availability?.dates ?? [];
  const selectedDateOption = useMemo(
    () => availableDates.find((item) => item.isoDate === selectedDate) ?? null,
    [availableDates, selectedDate],
  );
  const currentTimeSlots = selectedDateOption?.times ?? [];
  const canPickTime = Boolean(hasLocation && selectedDate);
  const hasSelection = Boolean(location && selectedDate && selectedTime);

  function handleLocationChange(nextLocation: BookingPayload["location"]) {
    setLocation(nextLocation);
    setSelectedDate("");
    setSelectedTime("");
    setAvailabilityError(null);
    setError(null);
  }

  useEffect(() => {
    if (!location) {
      setAvailability(null);
      setAvailabilityError(null);
      return;
    }

    let cancelled = false;
    async function loadAvailability() {
      setIsLoadingAvailability(true);
      setAvailabilityError(null);

      try {
        const response = await fetch(`/api/booking/options?location=${location}`);
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error ?? "Não foi possível carregar datas e horários.");
        }

        if (!cancelled) {
          setAvailability((data.options ?? null) as LocationAvailabilityResponse | null);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setAvailability(null);
        setAvailabilityError(
          loadError instanceof Error
            ? loadError.message
            : "Falha ao carregar disponibilidade.",
        );
      } finally {
        if (!cancelled) {
          setIsLoadingAvailability(false);
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [location]);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedTime("");
      return;
    }
    if (!currentTimeSlots.includes(selectedTime)) {
      setSelectedTime("");
    }
  }, [selectedDate, selectedTime, currentTimeSlots]);

  function handleSignIn() {
    if (!clerkEnabled) {
      setError(
        "Login indisponível no momento. Verifique a configuração do Clerk.",
      );
      return;
    }

    router.push("/sign-in?redirect_url=/agendar");
  }

  async function handleConfirm() {
    setError(null);
    if (!isAuthenticated) {
      handleSignIn();
      return;
    }

    if (!location || !selectedDate || !selectedTime) {
      setError("Selecione local, data e horário para continuar.");
      return;
    }

    const bookingLocation = location;
    const preferredPeriod = getPeriodFromTime(selectedTime);
    const payload: BookingPayload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      location: bookingLocation,
      preferredPeriod,
      reason: buildBookingReason(reason, selectedDate, selectedTime),
    };

    const parsed = bookingSchema.safeParse(payload);
    if (!parsed.success) {
      setError("Revise os campos e tente novamente.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/booking/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleSignIn();
          throw new Error("Entre na sua conta para concluir o agendamento.");
        }
        throw new Error("Não foi possível confirmar o agendamento.");
      }

      toast("Agendamento confirmado.");
      router.push("/dashboard");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Falha ao confirmar.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-border/70 bg-card/95 shadow-sm">
      <CardHeader className="space-y-3">
        <CardTitle>Agendar consulta</CardTitle>
        <CardDescription>
          Vamos por etapas curtas: local, data, horário e confirmação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">1. Local</p>
            <p className="text-xs text-muted-foreground">Escolha a unidade</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">2. Data</p>
            <p className="text-xs text-muted-foreground">Selecione um dia</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">3. Horário</p>
            <p className="text-xs text-muted-foreground">Defina o melhor turno</p>
          </div>
        </div>

        <fieldset className="space-y-3 rounded-xl border border-border/70 p-4">
          <div className="space-y-1">
            <Label>Escolha o local</Label>
            <p className="text-xs text-muted-foreground">
              Comece por onde prefere ser atendido.
            </p>
          </div>
          <RadioGroup>
            {locations.map((item) => (
              <label
                key={item.value}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
                  location === item.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem
                    name="location"
                    value={item.value}
                    checked={location === item.value}
                    onChange={() => handleLocationChange(item.value)}
                  />
                  <span>{item.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isAuthenticated
                    ? formatMoney(item.amountCents)
                    : "Entre para ver valor"}
                </span>
              </label>
            ))}
          </RadioGroup>
        </fieldset>

        <fieldset
          className={cn(
            "space-y-3 rounded-xl border border-border/70 p-4",
            !hasLocation && "opacity-60",
          )}
          disabled={!hasLocation}
        >
          <div className="space-y-1">
            <Label>Escolha a data</Label>
            <p className="text-xs text-muted-foreground">
              {hasLocation
                ? "Datas vindas de Tipos de Eventos + Disponibilidade + Reservas."
                : "Primeiro selecione o local de atendimento."}
            </p>
          </div>
          {isLoadingAvailability ? (
            <p className="text-xs text-muted-foreground">Carregando datas...</p>
          ) : null}
          {availabilityError ? (
            <p className="text-xs text-destructive">{availabilityError}</p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {availableDates.map((dateOption) => (
              <Button
                key={dateOption.isoDate}
                type="button"
                variant={
                  selectedDate === dateOption.isoDate ? "default" : "outline"
                }
                className="justify-start transition-all"
                onClick={() => setSelectedDate(dateOption.isoDate)}
              >
                {dateOption.weekdayLabel}, {dateOption.label}
              </Button>
            ))}
          </div>
          {hasLocation && !isLoadingAvailability && !availabilityError && availableDates.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Não há datas disponíveis para este local.
            </p>
          ) : null}
        </fieldset>

        <fieldset
          className={cn(
            "space-y-3 rounded-xl border border-border/70 p-4",
            !canPickTime && "opacity-60",
          )}
          disabled={!canPickTime}
        >
          <div className="space-y-1">
            <Label>Escolha o horário</Label>
            <p className="text-xs text-muted-foreground">
              {canPickTime
                ? `Turnos ajustados para ${selectedLocation?.label}.`
                : "Selecione local e data para ver os horários disponíveis."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {currentTimeSlots.map((slot) => (
              <Button
                key={slot}
                type="button"
                variant={selectedTime === slot ? "default" : "outline"}
                className="transition-all"
                onClick={() => setSelectedTime(slot)}
              >
                {slot}
              </Button>
            ))}
          </div>
          {canPickTime && currentTimeSlots.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Não há horários livres para esta data.
            </p>
          ) : null}
        </fieldset>

        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
          <p className="font-medium">Resumo rápido</p>
          <p className="text-muted-foreground">
            {selectedLocation?.label ?? "Selecione um local"}
            {selectedDateOption
              ? ` - ${selectedDateOption.weekdayLabel}, ${selectedDateOption.label}`
              : selectedDate
                ? ` - ${formatDateLabel(selectedDate)}`
                : " - sem data"}
            {selectedTime ? ` - ${selectedTime}` : " - sem horário"}
          </p>
          <p className="text-muted-foreground">
            {selectedLocation
              ? isAuthenticated
                ? `Valor previsto: ${formatMoney(selectedLocation.amountCents)}`
                : "Valor disponível somente após login"
              : "Selecione um local para ver o valor"}
          </p>
        </div>

        {isAuthenticated ? (
          <fieldset className="space-y-3 rounded-xl border border-border/70 p-4">
            <div className="space-y-1">
              <Label>Dados para confirmação</Label>
              <p className="text-xs text-muted-foreground">
                Só o essencial para concluir seu agendamento.
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="(85) 99999-9999"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="você@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo em 1 linha (opcional)</Label>
              <Input
                id="reason"
                value={reason}
                maxLength={120}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ex.: revisão de rotina"
              />
            </div>
          </fieldset>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            Entre para concluir o agendamento. Seus dados ficam salvos e você
            finaliza mais rápido nas próximas vezes.
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          {!isAuthenticated ? (
            <Button onClick={handleSignIn} disabled={!hasSelection}>
              Entrar para concluir
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={
                isSubmitting ||
                !name.trim() ||
                !phone.trim() ||
                !email.trim() ||
                !hasSelection
              }
            >
              {isSubmitting ? "Confirmando..." : "Confirmar agendamento"}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            Confirmação em menos de 1 minuto.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function getPeriodFromTime(time: string): BookingPayload["preferredPeriod"] {
  const hour = Number(time.split(":")[0] ?? "0");
  if (hour < 12) {
    return "manha";
  }
  if (hour < 18) {
    return "tarde";
  }
  return "noite";
}

function buildBookingReason(
  reason: string,
  selectedDate: string,
  selectedTime: string,
) {
  const preferredSlot = `Slot desejado: ${formatDateLabel(selectedDate)} ${selectedTime}`;
  const trimmedReason = reason.trim();
  if (!trimmedReason) {
    return preferredSlot.slice(0, 120);
  }
  return `${trimmedReason} | ${preferredSlot}`.slice(0, 120);
}

function formatDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}
