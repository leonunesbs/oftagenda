import { buildAvailabilityGroups, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { AdminCreateAppointmentView } from "@/components/admin-create-appointment-view";

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>
  | undefined;

function toSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export async function renderCreateAppointmentPage({
  asDrawer,
  searchParams,
}: {
  asDrawer: boolean;
  searchParams?: SearchParamsInput;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const data = await getAdminSnapshot();
  const availabilityGroups = buildAvailabilityGroups(data).map((group) => ({
    name: group.name,
    representativeId: group.representativeId,
  }));
  const eventTypes = data.eventTypes.map((eventType) => ({
    _id: String(eventType._id),
    name: eventType.name,
    title: eventType.title,
    kind: eventType.kind,
    availabilityId: eventType.availabilityId ? String(eventType.availabilityId) : undefined,
    location: eventType.location,
    active: eventType.active,
  }));

  return (
    <AdminCreateAppointmentView
      eventTypes={eventTypes}
      availabilityGroups={availabilityGroups}
      initialDate={toSingleValue(resolvedSearchParams.date)}
      initialTime={toSingleValue(resolvedSearchParams.time)}
      asDrawer={asDrawer}
      backHref="/dashboard/admin/agenda"
    />
  );
}
