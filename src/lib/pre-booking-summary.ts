import { api } from "@convex/_generated/api";

import type { BookingLocationOption } from "@/lib/booking-bootstrap";
import { getBookingBootstrapData } from "@/lib/booking-bootstrap";
import { getConvexHttpClient } from "@/lib/convex-server";

type PreBookingSummaryQueryParams = {
  locationId?: string;
  location?: string;
  date?: string;
  time?: string;
  payment?: string;
};

export type PreBookingSummaryData = {
  locationId: string;
  locationLabel: string;
  locationAddress: string;
  date: string;
  dateLabel: string;
  time: string;
  timeLabel: string;
  payment: string;
  hasRedactedParams: boolean;
  hasMissingParams: boolean;
  hasInvalidSelection: boolean;
};

export async function resolvePreBookingSummary(
  params: PreBookingSummaryQueryParams,
): Promise<PreBookingSummaryData> {
  const rawLocationId = (params.locationId ?? params.location ?? "").trim();
  const date = (params.date ?? "").trim();
  const time = (params.time ?? "").trim();
  const payment = (params.payment ?? "").trim();
  const hasRedactedParams = [rawLocationId, date, time, payment].some(
    isRedactedValue,
  );
  const hasMissingParams = !rawLocationId || !date || !time;

  if (hasRedactedParams || hasMissingParams) {
    return {
      locationId: rawLocationId,
      locationLabel: rawLocationId || "Local não informado",
      locationAddress: "",
      date,
      dateLabel: date ? formatDateLabel(date) : "Data não informada",
      time,
      timeLabel: time || "Horário não informado",
      payment,
      hasRedactedParams,
      hasMissingParams,
      hasInvalidSelection: true,
    };
  }

  const { locations, availabilityByLocation } = await getBookingBootstrapData();
  const resolvedLocationId = resolveLocationId(rawLocationId, locations);
  const selectedLocation =
    locations.find((locationOption) => locationOption.value === resolvedLocationId) ??
    null;
  const availabilityForLocation = resolvedLocationId
    ? (availabilityByLocation[resolvedLocationId] ?? null)
    : null;
  const dateOption =
    availabilityForLocation?.dates.find((dateOption) => dateOption.isoDate === date) ??
    null;
  const hasValidTime =
    selectedLocation && dateOption
      ? await validateTimeSelection({
          locationId: selectedLocation.value,
          date,
          time,
          fallbackTimes: dateOption.times,
        })
      : false;

  return {
    locationId: selectedLocation?.value ?? rawLocationId,
    locationLabel: selectedLocation?.label ?? rawLocationId,
    locationAddress: selectedLocation?.address ?? "",
    date,
    dateLabel: date ? formatDateLabel(date) : "Data não informada",
    time,
    timeLabel: time || "Horário não informado",
    payment,
    hasRedactedParams: false,
    hasMissingParams: false,
    hasInvalidSelection: !selectedLocation || !dateOption || !hasValidTime,
  };
}

async function validateTimeSelection(input: {
  locationId: string;
  date: string;
  time: string;
  fallbackTimes: string[];
}) {
  if (input.fallbackTimes.includes(input.time)) {
    return true;
  }

  try {
    const client = getConvexHttpClient();
    const options = await client.query(api.appointments.getBookingOptionsByLocation, {
      location: input.locationId,
      daysAhead: 3650,
      targetDate: input.date,
    });
    const liveDateOption = options.dates.find(
      (dateOption) => dateOption.isoDate === input.date,
    );
    if (!liveDateOption) {
      return false;
    }
    return liveDateOption.times.includes(input.time);
  } catch {
    // Do not block checkout on transient availability lookup failures.
    return true;
  }
}

function resolveLocationId(rawLocationId: string, locations: BookingLocationOption[]) {
  const directMatch = locations.find((locationOption) => locationOption.value === rawLocationId);
  if (directMatch) {
    return directMatch.value;
  }

  const normalizedRaw = normalizeLocationToken(rawLocationId);
  if (!normalizedRaw) {
    return rawLocationId;
  }

  for (const locationOption of locations) {
    const normalizedValue = normalizeLocationToken(locationOption.value);
    const normalizedLabel = normalizeLocationToken(locationOption.label);
    if (
      normalizedRaw === normalizedValue ||
      normalizedRaw === normalizedLabel ||
      normalizedLabel.includes(normalizedRaw) ||
      normalizedRaw.includes(normalizedValue)
    ) {
      return locationOption.value;
    }
  }

  return rawLocationId;
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

function formatDateLabel(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!day || !month || !year) {
    return isoDate;
  }
  return `${day}/${month}/${year}`;
}

function isRedactedValue(value: string) {
  return /(?:\[)?redacted(?:\])?/i.test(value.trim());
}
