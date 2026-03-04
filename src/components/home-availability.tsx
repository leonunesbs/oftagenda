"use client";

import * as React from "react";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

import type { BookingPayload } from "@/domain/booking/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  type CarouselApi,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type BookingLocationOption = {
  value: BookingPayload["location"];
  label: string;
  eventTypesCount?: number;
};

const fallbackLocations: BookingLocationOption[] = [
  { value: "fortaleza", label: "Fortaleza" },
  { value: "sao_domingos_do_maranhao", label: "São Domingos do Maranhão" },
  { value: "fortuna", label: "Fortuna" },
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

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function HomeAvailability() {
  const [location, setLocation] = React.useState<BookingPayload["location"] | "">("");
  const [locations, setLocations] = React.useState<BookingLocationOption[]>(fallbackLocations);
  const [availability, setAvailability] = React.useState<LocationAvailabilityResponse | null>(null);
  const [selectedDate, setSelectedDate] = React.useState("");
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [carouselApi, setCarouselApi] = React.useState<CarouselApi>();
  const [activeSlide, setActiveSlide] = React.useState(0);
  const hadLocationRef = React.useRef(false);
  const hadSelectedDateRef = React.useRef(false);
  const [isLoadingAvailability, startAvailabilityTransition] = React.useTransition();
  const [availabilityError, setAvailabilityError] = React.useState<string | null>(null);
  const [timeZone, setTimeZone] = React.useState<string | undefined>(undefined);

  const availableDates = availability?.dates ?? [];
  const availableDateLookup = React.useMemo(
    () => new Set(availableDates.map((item) => item.isoDate)),
    [availableDates],
  );
  const selectedDateOption = React.useMemo(
    () => availableDates.find((item) => item.isoDate === selectedDate) ?? null,
    [availableDates, selectedDate],
  );
  const selectedCalendarDate = React.useMemo(
    () => (selectedDate ? parseIsoDate(selectedDate) : undefined),
    [selectedDate],
  );
  const availableSlots = selectedDateOption?.times ?? [];
  const hasLocation = Boolean(location);
  const canPickTime = Boolean(hasLocation && selectedDate);
  const currentStep = !hasLocation ? 1 : !selectedDate ? 2 : !selectedTime ? 3 : 4;
  const maxUnlockedSlide = !hasLocation ? 0 : !selectedDate ? 1 : 2;
  const canAdvanceCurrentSlide =
    (activeSlide === 0 && hasLocation) ||
    (activeSlide === 1 && Boolean(selectedDate));

  React.useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadLocations() {
      try {
        const response = await fetch("/api/booking/locations");
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error ?? "Nao foi possivel carregar locais.");
        }

        const locationsResponse = Array.isArray(data.locations) ? data.locations : [];
        if (!cancelled && locationsResponse.length > 0) {
          setLocations(locationsResponse as BookingLocationOption[]);
        }
      } catch {
        if (!cancelled) {
          setLocations(fallbackLocations);
        }
      }
    }

    loadLocations();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!location) {
      return;
    }

    const exists = locations.some((item) => item.value === location);
    if (!exists) {
      setLocation("");
      setSelectedDate("");
      setSelectedTime(null);
      setAvailability(null);
    }
  }, [location, locations]);

  function handleLocationChange(nextLocation: BookingPayload["location"]) {
    setLocation(nextLocation);
    setAvailability(null);
    setSelectedDate("");
    setSelectedTime(null);
    setAvailabilityError(null);
  }

  React.useEffect(() => {
    if (!location) {
      setAvailability(null);
      setAvailabilityError(null);
      return;
    }

    let cancelled = false;

    startAvailabilityTransition(async () => {
      setAvailabilityError(null);

      try {
        const response = await fetch(`/api/booking/options?location=${location}`);
        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(data?.error ?? "Nao foi possivel carregar as disponibilidades.");
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
          loadError instanceof Error ? loadError.message : "Falha ao carregar disponibilidade.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [location]);

  React.useEffect(() => {
    if (!selectedDate) {
      setSelectedTime(null);
      return;
    }

    if (selectedTime && !availableSlots.includes(selectedTime)) {
      setSelectedTime(null);
    }
  }, [selectedDate, selectedTime, availableSlots]);

  React.useEffect(() => {
    if (!carouselApi) {
      return;
    }

    const updateActiveSlide = () => {
      setActiveSlide(carouselApi.selectedScrollSnap());
    };

    updateActiveSlide();
    carouselApi.on("select", updateActiveSlide);
    carouselApi.on("reInit", updateActiveSlide);

    return () => {
      carouselApi.off("select", updateActiveSlide);
      carouselApi.off("reInit", updateActiveSlide);
    };
  }, [carouselApi]);

  React.useEffect(() => {
    const justSelectedLocation = !hadLocationRef.current && hasLocation;
    if (justSelectedLocation && activeSlide === 0) {
      carouselApi?.scrollTo(1);
    }
    hadLocationRef.current = hasLocation;
  }, [hasLocation, activeSlide, carouselApi]);

  React.useEffect(() => {
    const hasDate = Boolean(selectedDate);
    const justSelectedDate = !hadSelectedDateRef.current && hasDate;
    if (justSelectedDate && activeSlide === 1) {
      carouselApi?.scrollTo(2);
    }
    hadSelectedDateRef.current = hasDate;
  }, [selectedDate, activeSlide, carouselApi]);

  React.useEffect(() => {
    if (!carouselApi) {
      return;
    }
    if (activeSlide > maxUnlockedSlide) {
      carouselApi.scrollTo(maxUnlockedSlide);
    }
  }, [activeSlide, maxUnlockedSlide, carouselApi]);

  function handleCalendarSelect(nextDate: Date | undefined) {
    if (!nextDate) {
      setSelectedDate("");
      return;
    }

    const isoDate = toIsoDate(nextDate);
    if (!availableDateLookup.has(isoDate)) {
      return;
    }

    setSelectedDate(isoDate);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { index: 0, title: "Local", done: currentStep > 1 },
          { index: 1, title: "Data", done: currentStep > 2 },
          { index: 2, title: "Horario", done: currentStep > 3 },
        ].map((step) => (
          <button
            key={step.title}
            type="button"
            onClick={() => {
              if (step.index <= maxUnlockedSlide) {
                carouselApi?.scrollTo(step.index);
              }
            }}
            disabled={step.index > maxUnlockedSlide}
            className={cn(
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              step.index > maxUnlockedSlide && "cursor-not-allowed opacity-60",
              activeSlide === step.index && "border-primary bg-primary/10",
              step.done && "border-emerald-500/40 bg-emerald-500/10",
              activeSlide !== step.index &&
                !step.done &&
                "border-border/70 bg-muted/20 hover:bg-muted/35",
            )}
          >
            <p className="font-medium text-foreground">
              {step.index + 1}. {step.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {step.done ? "Concluido" : activeSlide === step.index ? "Em andamento" : "Pendente"}
            </p>
          </button>
        ))}
      </div>

      <Carousel
        setApi={setCarouselApi}
        opts={{
          align: "start",
          dragFree: false,
          watchDrag: false,
        }}
        className="w-full px-10"
      >
        <CarouselContent>
          <CarouselItem className="h-full">
            <Card className="h-full rounded-3xl border-white/10 bg-linear-to-b from-card/95 to-card/75 backdrop-blur-2xl ring-0">
              <CardHeader className="space-y-2">
                <CardTitle className="text-base md:text-lg">1. Escolha o local</CardTitle>
                <CardDescription>Selecione onde prefere ser atendido.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 overflow-y-auto">
                <div className="space-y-1">
                  <Label>Locais de atendimento</Label>
                  <p className="text-xs text-muted-foreground">
                    As datas e horarios sao exibidos somente apos a selecao do local.
                  </p>
                </div>
                <RadioGroup>
                  {locations.map((item) => (
                    <label
                      key={item.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors",
                        location === item.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/30",
                      )}
                    >
                      <RadioGroupItem
                        name="home-location"
                        value={item.value}
                        checked={location === item.value}
                        onChange={() => handleLocationChange(item.value)}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </RadioGroup>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => carouselApi?.scrollTo(1)}
                    disabled={!hasLocation}
                  >
                    Avancar para data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>

          <CarouselItem className="h-full">
            <Card className="h-full rounded-3xl border-white/10 bg-linear-to-b from-card/95 to-card/75 backdrop-blur-2xl ring-0">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base md:text-lg">2. Selecione a data</CardTitle>
                    <CardDescription>
                      {hasLocation
                        ? "Escolha um dia disponivel para este local."
                        : "Primeiro escolha o local para desbloquear as disponibilidades."}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-white/10 bg-white/5">
                    {availableDates.length} datas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 overflow-y-auto">
                <fieldset
                  className={cn("space-y-3", !hasLocation && "opacity-60")}
                  disabled={!hasLocation}
                  aria-busy={isLoadingAvailability}
                >
                  <Label>Datas disponiveis</Label>
                  {isLoadingAvailability ? <p className="text-sm text-muted-foreground">Buscando agenda...</p> : null}
                  {availabilityError ? (
                    <p className="text-sm text-destructive">{availabilityError}</p>
                  ) : null}
                  {isLoadingAvailability ? (
                    <div className="mx-auto w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-background/35 p-3 shadow-inner sm:mx-0">
                      <Skeleton className="h-8 w-40" />
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: 35 }).map((_, index) => (
                          <Skeleton key={index} className="h-8 w-full rounded-lg" />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Calendar
                      mode="single"
                      locale={ptBR}
                      selected={selectedCalendarDate}
                      onSelect={handleCalendarSelect}
                      timeZone={timeZone}
                      disabled={(date) => !availableDateLookup.has(toIsoDate(date))}
                      className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-background/35 p-3 shadow-inner [--cell-size:min(2.1rem,11vw)] sm:mx-0 sm:[--cell-size:2.25rem]"
                      classNames={{ root: "w-full" }}
                    />
                  )}
                  {selectedDateOption ? (
                    <p className="text-xs text-muted-foreground">
                      Data selecionada: {selectedDateOption.weekdayLabel}, {selectedDateOption.label}
                    </p>
                  ) : null}
                  {hasLocation && !isLoadingAvailability && !availabilityError && availableDates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nao ha datas disponiveis para este local.
                    </p>
                  ) : null}
                </fieldset>
                <div className="flex flex-wrap justify-between gap-2">
                  <Button type="button" variant="outline" onClick={() => carouselApi?.scrollTo(0)}>
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => carouselApi?.scrollTo(2)}
                    disabled={!selectedDate}
                  >
                    Avancar para horario
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>

          <CarouselItem className="h-full">
            <Card className="h-full rounded-3xl border-white/10 bg-linear-to-b from-card/95 to-card/75 backdrop-blur-2xl ring-0">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base md:text-lg">3. Escolha o horario</CardTitle>
                    <CardDescription>
                      {canPickTime
                        ? "Selecione o melhor horario para continuar o agendamento."
                        : "Selecione local e data para ver os horarios livres."}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="border-white/10 bg-white/5">
                    {availableSlots.length} horarios livres
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 overflow-y-auto">
                <fieldset
                  className={cn("space-y-3", !canPickTime && "opacity-60")}
                  disabled={!canPickTime}
                  aria-busy={isLoadingAvailability}
                >
                  <Label>Horarios disponiveis</Label>
                  {isLoadingAvailability ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-9 rounded-xl" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          variant={selectedTime === slot ? "default" : "secondary"}
                          onClick={() => setSelectedTime(slot)}
                          className={cn(
                            "h-9 rounded-xl border border-transparent text-xs/relaxed",
                            selectedTime === slot && "ring-2 ring-primary/25",
                          )}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  )}
                  {canPickTime && availableSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nao ha horarios livres para esta data.
                    </p>
                  ) : null}
                  {selectedTime ? (
                    <p className="text-xs text-muted-foreground">
                      Horario selecionado: {selectedTime}
                    </p>
                  ) : null}
                </fieldset>
                <div className="rounded-2xl border border-white/10 bg-background/35 p-4 text-sm text-muted-foreground">
                  Atendimento presencial e online com confirmacao automatica.
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <Button type="button" variant="outline" onClick={() => carouselApi?.scrollTo(1)}>
                    Voltar
                  </Button>
                  <Button asChild disabled={!selectedTime}>
                    <Link href="/agendar">Continuar agendamento completo</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        </CarouselContent>
        <CarouselPrevious className="bg-background/70" />
        <CarouselNext className="bg-background/70" disabled={!canAdvanceCurrentSlide} />
      </Carousel>
    </div>
  );
}
