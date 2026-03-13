import { api } from "@convex/_generated/api";

import type { PaymentMode } from "@/lib/booking-bootstrap";
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
  consultationPriceCents: number;
  reservationFeeCents: number;
  reservationFeePercent: number;
  paymentMode: PaymentMode;
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
  const rawLocationId = normalizeLocationInput(params.locationId ?? params.location ?? "");
  const date = normalizeDateInput(params.date ?? "");
  const time = normalizeTimeInput(params.time ?? "");
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
      consultationPriceCents: 0,
      reservationFeeCents: 0,
      reservationFeePercent: 20,
      paymentMode: "booking_fee" as PaymentMode,
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

  const { locations } = await getBookingBootstrapData();
  const normalizedLocationId = normalizeLocationInput(rawLocationId);
  const selectedLocation =
    locations.find(
      (locationOption) =>
        normalizeLocationInput(locationOption.value) === normalizedLocationId ||
        normalizeLocationInput(locationOption.label) === normalizedLocationId,
    ) ??
    null;
  const validation =
    selectedLocation
      ? await validateSelectionForLocation({
          locationId: selectedLocation.value,
          date,
          time,
        })
      : { hasDateOption: false, hasValidTime: false };
  const paymentMode: PaymentMode = selectedLocation?.paymentMode ?? "booking_fee";
  const consultationPriceCents =
    typeof selectedLocation?.consultationPriceCents === "number"
      ? selectedLocation.consultationPriceCents
      : 0;
  const reservationFeePercent =
    typeof selectedLocation?.reservationFeePercent === "number"
      ? selectedLocation.reservationFeePercent
      : 20;
  const reservationFeeCents =
    typeof selectedLocation?.reservationFeeCents === "number"
      ? selectedLocation.reservationFeeCents
      : calculatePercentageCents(consultationPriceCents, reservationFeePercent);

  return {
    locationId: selectedLocation?.value ?? rawLocationId,
    locationLabel: selectedLocation?.label ?? rawLocationId,
    locationAddress: selectedLocation?.address ?? "",
    consultationPriceCents,
    reservationFeeCents,
    reservationFeePercent,
    paymentMode,
    date,
    dateLabel: date ? formatDateLabel(date) : "Data não informada",
    time,
    timeLabel: time || "Horário não informado",
    payment,
    hasRedactedParams: false,
    hasMissingParams: false,
    hasInvalidSelection:
      !selectedLocation || !validation.hasDateOption || !validation.hasValidTime,
  };
}

function calculatePercentageCents(amountCents: number, percent: number) {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return 0;
  }
  if (!Number.isFinite(percent) || percent <= 0) {
    return 0;
  }
  return Math.round((amountCents * percent) / 100);
}

async function validateSelectionForLocation(input: {
  locationId: string;
  date: string;
  time: string;
}) {
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
      return { hasDateOption: false, hasValidTime: false };
    }
    return {
      hasDateOption: true,
      hasValidTime: liveDateOption.times.includes(input.time),
    };
  } catch {
    // Do not block checkout on transient availability lookup failures.
    return {
      hasDateOption: true,
      hasValidTime: true,
    };
  }
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

function normalizeLocationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
}

function normalizeDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month}-${day}`;
  }

  const brMatch = trimmed.match(/^(\d{2})[/-](\d{2})(?:[/-](\d{4}))?$/);
  if (!brMatch) {
    return trimmed;
  }
  const [, day, month, year] = brMatch;
  const resolvedYear = year ?? String(new Date().getFullYear());
  return `${resolvedYear}-${month}-${day}`;
}

function normalizeTimeInput(value: string) {
  const trimmed = value.trim().replaceAll("h", ":");
  if (!trimmed) {
    return "";
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return trimmed;
  }
  const hours = match[1];
  const minutes = match[2];
  if (!hours || !minutes) {
    return trimmed;
  }
  return `${hours.padStart(2, "0")}:${minutes}`;
}
