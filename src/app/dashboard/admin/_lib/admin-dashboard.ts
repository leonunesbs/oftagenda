import { api } from "@convex/_generated/api";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

export const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"] as const;
export const selectClassName = "h-7 w-full rounded-md border border-input bg-input/20 px-2 text-xs";

export async function getAdminSnapshot() {
  const { client } = await getAuthenticatedConvexHttpClient();
  return client.query(api.admin.getManagementSnapshot, {});
}

export type AdminSnapshot = Awaited<ReturnType<typeof getAdminSnapshot>>;

export function formatMoney(cents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function formatDateForInput(timestamp: number) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatTimeForInput(timestamp: number) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function formatDateTime24h(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(timestamp));
}

function timeToMinutes(time: string) {
  const parts = time.split(":");
  const hours = Number(parts[0] ?? "0");
  const minutes = Number(parts[1] ?? "0");
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}

function resolveAvailabilityGroupName(availability: { _id: string; name?: string }) {
  const normalized = availability.name?.trim();
  if (normalized && normalized.length > 0) {
    return normalized;
  }
  return `Disponibilidade-${availability._id}`;
}

export function buildAvailabilityGroups(data: AdminSnapshot) {
  const availabilityGroupsMap = new Map<
    string,
    {
      name: string;
      representativeId: string;
      linkedEventsCount: number;
      slots: AdminSnapshot["availabilities"][number][];
    }
  >();

  for (const availability of data.availabilities) {
    const groupName = resolveAvailabilityGroupName({
      _id: String(availability._id),
      name: availability.name,
    });
    const current =
      availabilityGroupsMap.get(groupName) ??
      {
        name: groupName,
        representativeId: String(availability._id),
        linkedEventsCount: 0,
        slots: [],
      };
    current.slots.push(availability);
    current.linkedEventsCount = Math.max(current.linkedEventsCount, availability.linkedEventsCount ?? 0);
    availabilityGroupsMap.set(groupName, current);
  }

  return [...availabilityGroupsMap.values()]
    .map((group) => ({
      ...group,
      slots: [...group.slots].sort((a, b) => {
        if (a.weekday !== b.weekday) {
          return a.weekday - b.weekday;
        }
        return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
      }),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function getAvailabilityById(data: AdminSnapshot) {
  return new Map(data.availabilities.map((availability) => [String(availability._id), availability]));
}
