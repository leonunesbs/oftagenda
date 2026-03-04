import { BookingForm } from "@/components/booking-form";
import { getBookingBootstrapData } from "@/lib/booking-bootstrap";

type BookingFormContainerProps = {
  isAuthenticated: boolean;
  clerkEnabled: boolean;
  embedMode?: boolean;
};

export async function BookingFormContainer({
  isAuthenticated,
  clerkEnabled,
  embedMode = false,
}: BookingFormContainerProps) {
  const bootstrapData = await getBookingBootstrapData();

  return (
    <BookingForm
      isAuthenticated={isAuthenticated}
      clerkEnabled={clerkEnabled}
      embedMode={embedMode}
      initialLocations={bootstrapData.locations}
      initialLocationsError={bootstrapData.locationsError}
      initialAvailabilityByLocation={bootstrapData.availabilityByLocation}
      initialAvailabilityErrorsByLocation={bootstrapData.availabilityErrorsByLocation}
    />
  );
}
