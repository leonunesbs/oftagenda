"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useMemo, useRef, useState } from "react";
import { ptBR } from "date-fns/locale";

import type { BookingPayload } from "@/domain/booking/schema";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

const locations: Array<{
  value: BookingPayload["location"];
  label: string;
  amountCents: number;
}> = [
  { value: "fortaleza", label: "Fortaleza", amountCents: 12000 },
  {
    value: "sao_domingos_do_maranhao",
    label: "Sao Domingos do Maranhao",
    amountCents: 10000,
  },
  { value: "fortuna", label: "Fortuna", amountCents: 9000 },
];
const DRAFT_STORAGE_KEY = "oftagenda:booking-draft:v1";

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

function normalizeLocation(value: string | null | undefined): BookingPayload["location"] | "" {
  if (!value) {
    return "";
  }
  return locations.some((item) => item.value === value)
    ? (value as BookingPayload["location"])
    : "";
}

type BookingFormProps = {
  isAuthenticated: boolean;
  clerkEnabled: boolean;
  embedMode?: boolean;
};

export function BookingForm({
  isAuthenticated,
  clerkEnabled,
  embedMode = false,
}: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dateSectionRef = useRef<HTMLElement | null>(null);
  const timeSectionRef = useRef<HTMLDivElement | null>(null);
  const hasHydratedInitialDataRef = useRef(false);

  const [location, setLocation] = useState<BookingPayload["location"] | "">("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] =
    useState<LocationAvailabilityResponse | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(embedMode);

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
  const shouldShowTimeCard = Boolean(selectedDate);
  const availableDateSet = useMemo(
    () => new Set(availableDates.map((item) => item.isoDate)),
    [availableDates],
  );
  const firstAvailableDate = availableDates[0]?.isoDate ?? "";
  const lastAvailableDate = availableDates[availableDates.length - 1]?.isoDate ?? "";

  function handleLocationChange(nextLocation: BookingPayload["location"]) {
    setLocation(nextLocation);
    setAvailability(null);
    setSelectedDate("");
    setSelectedTime("");
    setIsConfirmDialogOpen(false);
    setAvailabilityError(null);
    setError(null);
    scrollToSection(dateSectionRef);
  }

  function handleDateChange(nextDate: string) {
    setSelectedDate(nextDate);
    setError(null);
    scrollToSection(timeSectionRef);
  }

  function handleTimeSelect(slot: string) {
    setSelectedTime(slot);
    setError(null);
  }

  function handleOpenConfirmationDialog() {
    if (!hasSelection) {
      setError("Selecione local, data e horario para continuar.");
      return;
    }
    setIsConfirmDialogOpen(true);
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
          throw new Error(data?.error ?? "Nao foi possivel carregar datas e horarios.");
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
      setIsConfirmDialogOpen(false);
      return;
    }
    if (!currentTimeSlots.includes(selectedTime)) {
      setSelectedTime("");
      setIsConfirmDialogOpen(false);
    }
  }, [selectedDate, selectedTime, currentTimeSlots]);

  useEffect(() => {
    if (hasHydratedInitialDataRef.current) {
      return;
    }
    hasHydratedInitialDataRef.current = true;

    const queryLocation = normalizeLocation(searchParams.get("location"));
    const queryDate = searchParams.get("date") ?? "";
    const queryTime = searchParams.get("time") ?? "";

    if (queryLocation) {
      setLocation(queryLocation);
      setSelectedDate(queryDate);
      setSelectedTime(queryTime);
      return;
    }

    const draftRaw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!draftRaw) {
      return;
    }

    try {
      const draft = JSON.parse(draftRaw) as {
        location?: string;
        selectedDate?: string;
        selectedTime?: string;
      };
      const draftLocation = normalizeLocation(draft.location);
      if (!draftLocation) {
        return;
      }
      setLocation(draftLocation);
      setSelectedDate(draft.selectedDate ?? "");
      setSelectedTime(draft.selectedTime ?? "");
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!availableDates.length) {
      return;
    }
    const hasCurrentDate = availableDates.some((item) => item.isoDate === selectedDate);
    if (selectedDate && hasCurrentDate) {
      return;
    }
    const firstDate = availableDates[0];
    if (firstDate) {
      setSelectedDate(firstDate.isoDate);
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }
    if (selectedTime && currentTimeSlots.includes(selectedTime)) {
      return;
    }
    const firstSlot = currentTimeSlots[0];
    if (firstSlot) {
      setSelectedTime(firstSlot);
    }
  }, [selectedDate, selectedTime, currentTimeSlots]);

  useEffect(() => {
    const nextEmbeddedMode = embedMode || searchParams.get("embed") === "1" || window.self !== window.top;
    setIsEmbedded(nextEmbeddedMode);
  }, [embedMode, searchParams]);

  useEffect(() => {
    if (!location) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        location,
        selectedDate,
        selectedTime,
      }),
    );
  }, [location, selectedDate, selectedTime]);

  useEffect(() => {
    if (!isEmbedded) {
      return;
    }
    document.body.classList.add("booking-embed-mode");
    return () => {
      document.body.classList.remove("booking-embed-mode");
    };
  }, [isEmbedded]);

  useEffect(() => {
    if (!isEmbedded || !cardRef.current) {
      return;
    }

    const observer = new ResizeObserver(() => {
      const height = cardRef.current?.offsetHeight ?? 0;
      window.parent.postMessage({ type: "oftagenda:booking:resize", height }, "*");
    });
    observer.observe(cardRef.current);
    window.parent.postMessage({ type: "oftagenda:booking:ready" }, "*");

    return () => {
      observer.disconnect();
    };
  }, [isEmbedded]);

  function handleStartBooking() {
    setError(null);

    if (!location || !selectedDate || !selectedTime) {
      setError("Selecione local, data e horario para continuar.");
      return;
    }

    const summaryUrl = buildPreBookingSummaryUrl({
      location,
      selectedDate,
      selectedTime,
    });

    if (!isAuthenticated) {
      if (!clerkEnabled) {
        setError("Login indisponivel no momento. Verifique a configuracao do Clerk.");
        return;
      }
      router.push(`/sign-in?redirect_url=${encodeURIComponent(summaryUrl)}`);
      return;
    }

    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setIsConfirmDialogOpen(false);
    router.push(summaryUrl);
  }

  return (
    <Card
      ref={cardRef}
      className={cn(
        "border-border/70 bg-card/95 shadow-sm",
        isEmbedded && "rounded-none border-x-0 border-y-0 shadow-none",
      )}
    >
      <CardHeader className="space-y-3">
        <CardTitle>Agendar consulta</CardTitle>
        <CardDescription>
          Selecione local, data e horario. Em seguida, revise no resumo antes de concluir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-5 lg:gap-5">
          <section className="space-y-4 rounded-xl border border-border/70 p-4 lg:col-span-3">
            <div className="space-y-1">
              <Label>1. Escolha o local</Label>
              <p className="text-xs text-muted-foreground">
                Em telas grandes, esta etapa fica ao lado do calendario.
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
                    {isAuthenticated ? formatMoney(item.amountCents) : "Entre para ver valor"}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </section>

          <section
            ref={dateSectionRef}
            className={cn(
              "scroll-mt-24 space-y-4 rounded-xl border border-border/70 p-4 lg:col-span-2",
              !hasLocation && "opacity-60",
            )}
            aria-busy={isLoadingAvailability}
          >
            <div className="space-y-1">
              <Label>2. Escolha a data</Label>
              <p className="text-xs text-muted-foreground">
                {hasLocation
                  ? "Selecione no calendario um dia disponivel para este local."
                  : "Primeiro selecione o local de atendimento."}
              </p>
            </div>

            {!hasLocation ? null : isLoadingAvailability ? (
              <div className="space-y-3">
                <Skeleton className="h-[280px] w-full rounded-xl" />
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-9 rounded-md" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/70 bg-muted/10 p-2">
                  <Calendar
                    mode="single"
                    locale={ptBR}
                    selected={selectedDate ? parseIsoDate(selectedDate) : undefined}
                    onSelect={(dateValue) => {
                      if (!dateValue) {
                        return;
                      }
                      const isoDate = toIsoDate(dateValue);
                      if (!availableDateSet.has(isoDate)) {
                        return;
                      }
                      handleDateChange(isoDate);
                    }}
                    disabled={(dateValue) => !availableDateSet.has(toIsoDate(dateValue))}
                    fromDate={firstAvailableDate ? parseIsoDate(firstAvailableDate) : undefined}
                    toDate={lastAvailableDate ? parseIsoDate(lastAvailableDate) : undefined}
                    className="w-full min-h-[360px] [--cell-size:2.25rem]"
                    classNames={{ root: "w-full" }}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {availableDates.slice(0, 6).map((dateOption) => (
                    <Button
                      key={dateOption.isoDate}
                      type="button"
                      variant={selectedDate === dateOption.isoDate ? "default" : "outline"}
                      className="justify-start transition-all"
                      onClick={() => handleDateChange(dateOption.isoDate)}
                    >
                      {dateOption.weekdayLabel}, {dateOption.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {availabilityError ? <p className="text-xs text-destructive">{availabilityError}</p> : null}
            {hasLocation && !isLoadingAvailability && !availabilityError && availableDates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nao ha datas disponiveis para este local.
              </p>
            ) : null}
          </section>

          <div
            ref={timeSectionRef}
            aria-hidden={!shouldShowTimeCard}
            className={cn(
              "scroll-mt-24 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out lg:col-span-3",
              shouldShowTimeCard ? "max-h-[1000px] opacity-100" : "pointer-events-none max-h-0 opacity-0",
            )}
          >
            <section
              className={cn(
                "space-y-4 rounded-xl border border-border/70 p-4",
                !canPickTime && "opacity-60",
              )}
              aria-busy={isLoadingAvailability}
            >
              <div className="space-y-1">
                <Label>3. Escolha o horario</Label>
                <p className="text-xs text-muted-foreground">
                  {canPickTime
                    ? `Horarios disponiveis para ${selectedLocation?.label}.`
                    : "Selecione local e data para carregar os horarios abaixo."}
                </p>
              </div>

              {isLoadingAvailability ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <Skeleton key={index} className="h-9 rounded-md" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {currentTimeSlots.map((slot) => (
                    <Button
                      key={slot}
                      type="button"
                      variant={selectedTime === slot ? "default" : "outline"}
                      className="transition-all"
                      onClick={() => handleTimeSelect(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              )}

              {canPickTime && currentTimeSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nao ha horarios livres para esta data.
                </p>
              ) : null}

              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm">
                <p className="font-medium">Resumo rapido</p>
                <p className="text-muted-foreground">
                  {selectedLocation?.label ?? "Selecione um local"}
                  {selectedDateOption
                    ? ` - ${selectedDateOption.weekdayLabel}, ${selectedDateOption.label}`
                    : selectedDate
                      ? ` - ${formatDateLabel(selectedDate)}`
                      : " - sem data"}
                  {selectedTime ? ` - ${selectedTime}` : " - sem horario"}
                </p>
              </div>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex justify-end">
                <Button type="button" onClick={handleOpenConfirmationDialog} disabled={!hasSelection}>
                  Confirmar horario
                </Button>
              </div>
            </section>
          </div>
        </div>
      </CardContent>

      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar agendamento</DialogTitle>
            <DialogDescription>
              Revise os dados antes de seguir para o resumo do pre-agendamento.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
            <p>
              <span className="font-medium text-foreground">Local:</span>{" "}
              {selectedLocation?.label ?? "Nao informado"}
            </p>
            <p>
              <span className="font-medium text-foreground">Data:</span>{" "}
              {selectedDateOption
                ? `${selectedDateOption.weekdayLabel}, ${selectedDateOption.label}`
                : selectedDate
                  ? formatDateLabel(selectedDate)
                  : "Nao informada"}
            </p>
            <p>
              <span className="font-medium text-foreground">Horario:</span>{" "}
              {selectedTime || "Nao informado"}
            </p>
            <p>
              <span className="font-medium text-foreground">Valor previsto:</span>{" "}
              {selectedLocation
                ? isAuthenticated
                  ? formatMoney(selectedLocation.amountCents)
                  : "Disponivel apos login"
                : "Selecione um local"}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Editar dados
            </Button>
            <Button type="button" onClick={handleStartBooking} disabled={!hasSelection}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function buildPreBookingSummaryUrl({
  location,
  selectedDate,
  selectedTime,
}: {
  location: BookingPayload["location"];
  selectedDate: string;
  selectedTime: string;
}) {
  const params = new URLSearchParams({
    location,
    date: selectedDate,
    time: selectedTime,
  });
  return `/agendar/resumo?${params.toString()}`;
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

function toIsoDate(date: Date) {
  const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map((value) => Number(value));
  const safeYear = typeof year === "number" && Number.isFinite(year) ? year : 1970;
  const safeMonth = typeof month === "number" && Number.isFinite(month) ? month : 1;
  const safeDay = typeof day === "number" && Number.isFinite(day) ? day : 1;
  return new Date(safeYear, safeMonth - 1, safeDay, 12, 0, 0);
}

function scrollToSection(sectionRef: { current: HTMLElement | null }) {
  if (typeof window === "undefined" || !sectionRef.current) {
    return;
  }
  if (!window.matchMedia("(max-width: 1023px)").matches) {
    return;
  }
  window.setTimeout(() => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}
