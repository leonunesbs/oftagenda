"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type {
  BookingLocationOption,
  LocationAvailabilityResponse,
} from "@/lib/booking-bootstrap";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import type { BookingPayload } from "@/domain/booking/schema";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { parseAsString, useQueryStates } from "nuqs";

const DRAFT_STORAGE_KEY = "oftagenda:booking-draft:v1";

type BookingDraft = {
  location: BookingPayload["location"];
  selectedDate: string;
  selectedTime: string;
};

type BookingOptionsApiResponse = {
  ok: boolean;
  options?: LocationAvailabilityResponse;
  error?: string;
};

type BookingFormProps = {
  isAuthenticated: boolean;
  clerkEnabled: boolean;
  embedMode?: boolean;
  initialLocations: BookingLocationOption[];
  initialLocationsError?: string | null;
  initialAvailabilityByLocation: Record<string, LocationAvailabilityResponse>;
  initialAvailabilityErrorsByLocation: Record<string, string>;
};

export function BookingForm({
  isAuthenticated,
  clerkEnabled,
  embedMode = false,
  initialLocations,
  initialLocationsError = null,
  initialAvailabilityByLocation,
  initialAvailabilityErrorsByLocation,
}: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dateSectionRef = useRef<HTMLElement | null>(null);
  const timeSectionRef = useRef<HTMLDivElement | null>(null);
  const locationListRef = useRef<HTMLDivElement | null>(null);

  const [bookingParams, setBookingParams] = useQueryStates(
    {
      locationId: parseAsString,
      date: parseAsString,
      time: parseAsString,
    },
    {
      history: "replace",
      shallow: true,
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [locations] = useState<BookingLocationOption[]>(initialLocations);
  const [isEmbedded, setIsEmbedded] = useState(embedMode);
  const [isLocationOverflowing, setIsLocationOverflowing] = useState(false);
  const [isStartingBooking, startStartingBookingTransition] = useTransition();
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [timesByDateKey, setTimesByDateKey] = useState<Record<string, string[]>>(
    {},
  );
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);
  const [timeLoadError, setTimeLoadError] = useState<string | null>(null);
  const locationId = bookingParams.locationId ?? "";
  const selectedDate = bookingParams.date ?? "";
  const selectedTime = bookingParams.time ?? "";

  const selectedLocation = locations.find((item) => item.value === locationId);
  const hasLocation = Boolean(selectedLocation);
  const availability = selectedLocation
    ? (initialAvailabilityByLocation[selectedLocation.value] ?? null)
    : null;
  const availabilityError = selectedLocation
    ? (initialAvailabilityErrorsByLocation[selectedLocation.value] ?? null)
    : null;
  const locationsError = initialLocationsError;
  const availableDates = availability?.dates ?? [];
  const selectedDateOption = useMemo(
    () => availableDates.find((item) => item.isoDate === selectedDate) ?? null,
    [availableDates, selectedDate],
  );
  const selectedDateCacheKey =
    selectedLocation && selectedDate
      ? `${selectedLocation.value}|${selectedDate}`
      : "";
  const currentTimeSlots = selectedDateCacheKey
    ? (timesByDateKey[selectedDateCacheKey] ?? null)
    : [];
  const filteredTimeSlots = useMemo(() => {
    if (currentTimeSlots === null) {
      return [];
    }
    if (!selectedDate) {
      return currentTimeSlots;
    }
    const now = new Date(currentTimestamp);
    const todayIso = toIsoDate(now);
    if (selectedDate !== todayIso) {
      return currentTimeSlots;
    }
    const currentTime = formatCurrentTime(now);
    return currentTimeSlots.filter((slot) => slot > currentTime);
  }, [currentTimestamp, currentTimeSlots, selectedDate]);
  const canPickTime = Boolean(hasLocation && selectedDate);
  const hasSelection = Boolean(
    selectedLocation && selectedDate && selectedTime,
  );
  const shouldShowTimeCard = Boolean(selectedDate);
  const availableDateSet = useMemo(
    () => new Set(availableDates.map((item) => item.isoDate)),
    [availableDates],
  );
  const firstAvailableDate = availableDates[0]?.isoDate ?? "";
  const lastAvailableDate =
    availableDates[availableDates.length - 1]?.isoDate ?? "";

  useEffect(() => {
    const legacyLocationId = searchParams.get("location");
    if (locationId || !legacyLocationId) {
      return;
    }
    const resolvedLocationId = resolveLegacyLocationId(legacyLocationId, locations);
    if (!resolvedLocationId) {
      return;
    }
    void setBookingParams({ locationId: resolvedLocationId });
  }, [locationId, locations, searchParams, setBookingParams]);

  function handleLocationChange(nextLocationId: BookingPayload["location"]) {
    trackEvent("select_city", { location: nextLocationId });
    void setBookingParams({
      locationId: nextLocationId,
      date: null,
      time: null,
    });
    setError(null);
    scrollToSection(dateSectionRef);
  }

  function handleDateChange(nextDate: string) {
    void setBookingParams({
      date: nextDate,
      time: null,
    });
    setError(null);
    scrollToSection(timeSectionRef);
  }

  function handleTimeSelect(slot: string) {
    void setBookingParams({ time: slot });
    setError(null);
  }

  useEffect(() => {
    if (!locationId) {
      return;
    }

    const exists = locations.some((item) => item.value === locationId);
    if (!exists) {
      void setBookingParams({
        locationId: null,
        date: null,
        time: null,
      });
    }
  }, [locationId, locations, setBookingParams]);

  useEffect(() => {
    if (!selectedLocation || !selectedDate) {
      setIsLoadingTimes(false);
      setTimeLoadError(null);
      return;
    }

    const cacheKey = `${selectedLocation.value}|${selectedDate}`;
    if (Object.prototype.hasOwnProperty.call(timesByDateKey, cacheKey)) {
      setIsLoadingTimes(false);
      setTimeLoadError(null);
      return;
    }

    const abortController = new AbortController();
    const params = new URLSearchParams({
      location: selectedLocation.value,
      targetDate: selectedDate,
    });

    setIsLoadingTimes(true);
    setTimeLoadError(null);

    void fetch(`/api/booking/options?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: abortController.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as BookingOptionsApiResponse;
        if (!response.ok || !data.ok) {
          throw new Error(data.error ?? "Falha ao carregar horários.");
        }

        const dateOption = data.options?.dates.find(
          (item) => item.isoDate === selectedDate,
        );
        setTimesByDateKey((previous) => ({
          ...previous,
          [cacheKey]: dateOption?.times ?? [],
        }));
      })
      .catch((fetchError: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }
        setTimeLoadError(
          fetchError instanceof Error
            ? fetchError.message
            : "Falha ao carregar horários.",
        );
        setTimesByDateKey((previous) => ({
          ...previous,
          [cacheKey]: [],
        }));
      })
      .finally(() => {
        if (abortController.signal.aborted) {
          return;
        }
        setIsLoadingTimes(false);
      });

    return () => {
      abortController.abort();
    };
  }, [selectedDate, selectedLocation, timesByDateKey]);

  useEffect(() => {
    if (!selectedDate) {
      if (selectedTime) {
        void setBookingParams({ time: null });
      }
      return;
    }
    if (currentTimeSlots === null) {
      return;
    }
    if (selectedTime && !filteredTimeSlots.includes(selectedTime)) {
      void setBookingParams({ time: null });
    }
  }, [
    currentTimeSlots,
    selectedDate,
    selectedTime,
    filteredTimeSlots,
    setBookingParams,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 30_000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const nextEmbeddedMode =
      embedMode ||
      searchParams.get("embed") === "1" ||
      window.self !== window.top;
    setIsEmbedded(nextEmbeddedMode);
  }, [embedMode, searchParams]);

  useEffect(() => {
    if (isDraftHydrated) {
      return;
    }
    if (locationId || selectedDate || selectedTime) {
      setIsDraftHydrated(true);
      return;
    }

    const draftRaw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!draftRaw) {
      setIsDraftHydrated(true);
      return;
    }

    try {
      const draft = JSON.parse(draftRaw) as Partial<BookingDraft>;
      if (typeof draft.location !== "string" || !draft.location) {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        setIsDraftHydrated(true);
        return;
      }

      const locationExists = locations.some(
        (item) => item.value === draft.location,
      );
      if (!locationExists) {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        setIsDraftHydrated(true);
        return;
      }

      const availabilityForLocation =
        initialAvailabilityByLocation[draft.location];
      const draftDate =
        typeof draft.selectedDate === "string" ? draft.selectedDate : "";
      const dateOption = availabilityForLocation?.dates.find(
        (item) => item.isoDate === draftDate,
      );
      const restoredDate = dateOption ? draftDate : "";
      const restoredTime =
        dateOption &&
        typeof draft.selectedTime === "string" &&
        dateOption.times.includes(draft.selectedTime)
          ? draft.selectedTime
          : "";

      void setBookingParams({
        locationId: draft.location,
        date: restoredDate || null,
        time: restoredTime || null,
      });
    } catch {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } finally {
      setIsDraftHydrated(true);
    }
  }, [
    initialAvailabilityByLocation,
    isDraftHydrated,
    locationId,
    locations,
    selectedDate,
    selectedTime,
    setBookingParams,
  ]);

  useEffect(() => {
    if (!isDraftHydrated) {
      return;
    }

    if (!locationId) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      DRAFT_STORAGE_KEY,
      JSON.stringify({
        location: locationId,
        selectedDate,
        selectedTime,
      }),
    );
  }, [isDraftHydrated, locationId, selectedDate, selectedTime]);

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

    let rafId = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const height = cardRef.current?.offsetHeight ?? 0;
        window.parent.postMessage(
          { type: "oftagenda:booking:resize", height },
          "*",
        );
      });
    });
    observer.observe(cardRef.current);
    window.parent.postMessage({ type: "oftagenda:booking:ready" }, "*");

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [isEmbedded]);

  useEffect(() => {
    const listElement = locationListRef.current;
    if (!listElement) {
      setIsLocationOverflowing(false);
      return;
    }

    let rafId = 0;
    const updateOverflowState = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
        if (!isDesktop) {
          setIsLocationOverflowing(false);
          return;
        }
        setIsLocationOverflowing(
          listElement.scrollHeight > listElement.clientHeight + 1,
        );
      });
    };

    updateOverflowState();
    const observer = new ResizeObserver(updateOverflowState);
    observer.observe(listElement);
    window.addEventListener("resize", updateOverflowState);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
      window.removeEventListener("resize", updateOverflowState);
    };
  }, [locations]);

  function handleStartBooking() {
    if (isStartingBooking) {
      return;
    }
    setError(null);

    if (!selectedLocation || !selectedDate || !selectedTime) {
      setError("Selecione local, data e horário para continuar.");
      return;
    }

    const summaryUrl = buildPreBookingSummaryUrl({
      locationId: selectedLocation.value,
      selectedDate,
      selectedTime,
    });
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    startStartingBookingTransition(() => {
      trackEvent("start_booking", {
        location: selectedLocation.value,
        date: selectedDate,
        time: selectedTime,
        authenticated: isAuthenticated,
        clerkEnabled,
      });
      router.push(summaryUrl);
    });
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
          Selecione local, data e horário. Em seguida, revise no resumo antes de
          concluir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid min-w-0 gap-4 sm:grid-cols-5 sm:auto-rows-auto md:gap-5">
          <section className="min-w-0 h-fit self-start space-y-4 rounded-xl border border-border/70 p-4 sm:col-span-3">
            <div className="space-y-1">
              <Label>1. Escolha o local de atendimento</Label>
              <p className="text-xs text-muted-foreground">
                Escolha o local onde você deseja ser atendido para visualizar as
                datas e horários disponíveis. Estamos aqui para tornar seu
                agendamento simples, rápido e tranquilo.
              </p>
            </div>
            {locations.length > 0 ? (
              <div
                ref={locationListRef}
                className="max-h-88 overflow-y-auto pr-1 md:max-h-96"
              >
                <RadioGroup
                  name="location"
                  value={locationId ?? undefined}
                  onValueChange={(value) => handleLocationChange(value)}
                  className="space-y-2"
                >
                  {locations.map((item) => (
                    <label
                      key={item.value}
                      className={cn(
                        "flex flex-wrap cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors sm:flex-nowrap",
                        locationId === item.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/30",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <RadioGroupItem
                          value={item.value}
                        />
                        <div className="min-w-0">
                          <span className="block min-w-0 wrap-break-word">
                            {item.label}
                          </span>
                          {item.address ? (
                            <span className="block min-w-0 wrap-break-word text-xs text-muted-foreground">
                              {item.address}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span className="w-full pl-8 text-left text-xs text-muted-foreground sm:w-auto sm:pl-0 sm:text-right">
                        {item.eventTypesCount
                          ? `${item.eventTypesCount} tipos`
                          : "Evento ativo"}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground">
                Nenhum evento ativo disponível para agendamento.
              </p>
            )}
            {locationsError ? (
              <p className="text-xs text-muted-foreground">{locationsError}</p>
            ) : null}
          </section>

          <section
            ref={dateSectionRef}
            className={cn(
              "min-w-0 h-fit self-start scroll-mt-24 space-y-4 rounded-xl border border-border/70 p-4 sm:col-span-2 sm:row-span-2",
              !hasLocation && "opacity-60",
            )}
          >
            <div className="space-y-1">
              <Label>2. Escolha a data</Label>
              <p className="text-xs text-muted-foreground">
                {hasLocation
                  ? "Selecione no calendário um dia disponível para este local."
                  : "Primeiro selecione o evento."}
              </p>
            </div>

            {!hasLocation ? null : (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/70 bg-muted/10 p-2">
                  <Calendar
                    mode="single"
                    locale={ptBR}
                    selected={
                      selectedDate ? parseIsoDate(selectedDate) : undefined
                    }
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
                    disabled={(dateValue) =>
                      !availableDateSet.has(toIsoDate(dateValue))
                    }
                    fromDate={
                      firstAvailableDate
                        ? parseIsoDate(firstAvailableDate)
                        : undefined
                    }
                    toDate={
                      lastAvailableDate
                        ? parseIsoDate(lastAvailableDate)
                        : undefined
                    }
                    className="mx-auto w-full max-w-88 px-0 [--cell-size:clamp(1.65rem,6.2vw,2.2rem)] sm:max-w-none sm:px-1 sm:[--cell-size:clamp(1.85rem,3.8vw,2.5rem)]"
                    classNames={{
                      root: "w-full",
                      month:
                        "flex w-full flex-col items-center sm:items-stretch",
                      table: "mx-auto w-full table-fixed",
                    }}
                  />
                </div>

                <div className="relative z-10 rounded-xl bg-card/80 p-1 backdrop-blur-sm">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {availableDates.slice(0, 6).map((dateOption) => (
                      <Button
                        key={dateOption.isoDate}
                        type="button"
                        variant={
                          selectedDate === dateOption.isoDate
                            ? "default"
                            : "outline"
                        }
                        className="h-auto w-full min-w-0 justify-start whitespace-normal py-2 text-left leading-tight transition-all"
                        onClick={() => handleDateChange(dateOption.isoDate)}
                      >
                        {dateOption.weekdayLabel}, {dateOption.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {availabilityError ? (
              <p className="text-xs text-destructive">{availabilityError}</p>
            ) : null}
            {hasLocation &&
            !availabilityError &&
            availableDates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Não há datas disponíveis para este local.
              </p>
            ) : null}
          </section>

          <div
            ref={timeSectionRef}
            aria-hidden={!shouldShowTimeCard}
            className={cn(
              "min-w-0 scroll-mt-24 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
              isLocationOverflowing
                ? "sm:col-span-5 sm:row-start-3"
                : "sm:col-span-3 sm:row-start-2",
              shouldShowTimeCard
                ? "max-h-[1000px] opacity-100"
                : "pointer-events-none max-h-0 opacity-0",
            )}
          >
            <section
              className={cn(
                "space-y-4 rounded-xl border border-border/70 p-4",
                !canPickTime && "opacity-60",
              )}
            >
              <div className="space-y-1">
                <Label>3. Escolha o horário</Label>
                <p className="text-xs text-muted-foreground">
                  {canPickTime
                    ? isLoadingTimes
                      ? "Carregando horários..."
                      : `Horários disponíveis para ${selectedLocation?.label}.`
                    : "Selecione evento e data para carregar os horários abaixo."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filteredTimeSlots.map((slot) => (
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

              {canPickTime &&
              !isLoadingTimes &&
              !timeLoadError &&
              filteredTimeSlots.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Não há horários livres para esta data.
                </p>
              ) : null}
              {timeLoadError ? (
                <p className="text-xs text-destructive">{timeLoadError}</p>
              ) : null}

              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm">
                <p className="font-medium">Resumo rápido</p>
                <p className="text-muted-foreground">
                  {selectedLocation?.label ?? "Selecione um evento"}
                  {selectedDateOption
                    ? ` - ${selectedDateOption.weekdayLabel}, ${selectedDateOption.label}`
                    : selectedDate
                      ? ` - ${formatDateLabel(selectedDate)}`
                      : " - sem data"}
                  {selectedTime ? ` - ${selectedTime}` : " - sem horário"}
                </p>
              </div>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleStartBooking}
                  disabled={!hasSelection || isStartingBooking}
                >
                  {isStartingBooking ? "Processando..." : "Confirmar horário"}
                </Button>
              </div>
            </section>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildPreBookingSummaryUrl({
  locationId,
  selectedDate,
  selectedTime,
}: {
  locationId: BookingPayload["location"];
  selectedDate: string;
  selectedTime: string;
}) {
  const params = new URLSearchParams({
    locationId,
    date: selectedDate,
    time: selectedTime,
  });
  return `/agendar/resumo?${params.toString()}`;
}

function formatDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function toIsoDate(date: Date) {
  const localDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
  );
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, "0");
  const day = String(localDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCurrentTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map((value) => Number(value));
  const safeYear =
    typeof year === "number" && Number.isFinite(year) ? year : 1970;
  const safeMonth =
    typeof month === "number" && Number.isFinite(month) ? month : 1;
  const safeDay = typeof day === "number" && Number.isFinite(day) ? day : 1;
  return new Date(safeYear, safeMonth - 1, safeDay, 12, 0, 0);
}

function resolveLegacyLocationId(
  legacyLocationId: string,
  locations: BookingLocationOption[],
) {
  const raw = legacyLocationId.trim();
  if (!raw) {
    return undefined;
  }
  const directMatch = locations.find((item) => item.value === raw);
  if (directMatch) {
    return directMatch.value;
  }

  const normalizedRaw = normalizeLocationToken(raw);
  if (!normalizedRaw) {
    return undefined;
  }

  for (const item of locations) {
    const normalizedValue = normalizeLocationToken(item.value);
    const normalizedLabel = normalizeLocationToken(item.label);
    if (
      normalizedRaw === normalizedValue ||
      normalizedRaw === normalizedLabel ||
      normalizedLabel.includes(normalizedRaw) ||
      normalizedRaw.includes(normalizedValue)
    ) {
      return item.value;
    }
  }

  return undefined;
}

function normalizeLocationToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");
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
