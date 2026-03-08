import { api } from "@convex/_generated/api";

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

  const { locations } = await getBookingBootstrapData();
  const selectedLocation =
    locations.find((locationOption) => locationOption.value === rawLocationId) ??
    null;
  const validation =
    selectedLocation
      ? await validateSelectionForLocation({
          locationId: selectedLocation.value,
          date,
          time,
        })
      : { hasDateOption: false, hasValidTime: false };

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
    hasInvalidSelection:
      !selectedLocation || !validation.hasDateOption || !validation.hasValidTime,
  };
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
