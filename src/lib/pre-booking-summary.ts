import { getBookingBootstrapData } from "@/lib/booking-bootstrap";

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
  const locationId = (params.locationId ?? params.location ?? "").trim();
  const date = (params.date ?? "").trim();
  const time = (params.time ?? "").trim();
  const payment = (params.payment ?? "").trim();
  const hasRedactedParams = [locationId, date, time, payment].some(
    isRedactedValue,
  );
  const hasMissingParams = !locationId || !date || !time;

  if (hasRedactedParams || hasMissingParams) {
    return {
      locationId,
      locationLabel: locationId || "Local não informado",
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
  const selectedLocation =
    locations.find((locationOption) => locationOption.value === locationId) ??
    null;
  const availabilityForLocation = availabilityByLocation[locationId] ?? null;
  const dateOption =
    availabilityForLocation?.dates.find((dateOption) => dateOption.isoDate === date) ??
    null;
  const hasValidTime = Boolean(dateOption?.times.includes(time));

  return {
    locationId,
    locationLabel: selectedLocation?.label ?? locationId,
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
