import { api } from "@convex/_generated/api";

import { getConvexHttpClient } from "@/lib/convex-server";

export type BookingLocationOption = {
  value: string;
  label: string;
  address?: string;
  eventTypesCount?: number;
};

export type LocationAvailabilityDate = {
  isoDate: string;
  label: string;
  weekdayLabel: string;
  times: string[];
};

export type LocationAvailabilityResponse = {
  location: string;
  dates: LocationAvailabilityDate[];
};

export type BookingBootstrapData = {
  locations: BookingLocationOption[];
  locationsError: string | null;
  availabilityByLocation: Record<string, LocationAvailabilityResponse>;
  availabilityErrorsByLocation: Record<string, string>;
};

export async function getBookingBootstrapData(): Promise<BookingBootstrapData> {
  const client = getConvexHttpClient();
  let locations: BookingLocationOption[] = [];
  let locationsError: string | null = null;

  try {
    const response = await client.query(api.appointments.getActiveBookingLocations, {});
    locations = Array.isArray(response) ? (response as BookingLocationOption[]) : [];
  } catch (error) {
    locationsError =
      error instanceof Error ? error.message : "Falha ao carregar eventos disponiveis.";
  }

  const availabilityByLocation: Record<string, LocationAvailabilityResponse> = {};
  const availabilityErrorsByLocation: Record<string, string> = {};

  await Promise.all(
    locations.map(async (locationOption) => {
      try {
        const options = await client.query(api.appointments.getBookingOptionsByLocation, {
          location: locationOption.value,
          daysAhead: 14,
        });
        availabilityByLocation[locationOption.value] =
          (options as LocationAvailabilityResponse) ?? {
            location: locationOption.value,
            dates: [],
          };
      } catch (error) {
        availabilityErrorsByLocation[locationOption.value] =
          error instanceof Error ? error.message : "Falha ao carregar disponibilidade.";
      }
    }),
  );

  return {
    locations,
    locationsError,
    availabilityByLocation,
    availabilityErrorsByLocation,
  };
}
