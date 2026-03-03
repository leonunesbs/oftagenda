import Link from "next/link";

import { api } from "@convex/_generated/api";
import { AdminAvailabilityEditor } from "@/components/admin-availability-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedConvexHttpClient } from "@/lib/convex-server";

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

async function getAdminSnapshot() {
  const { client } = await getAuthenticatedConvexHttpClient();
  return client.query(api.admin.getManagementSnapshot, {});
}

export default async function AvailabilityDetailsPage({
  params,
}: {
  params: Promise<{ availabilityId: string }>;
}) {
  const { availabilityId } = await params;
  const data = await getAdminSnapshot();

  const availabilityGroupsMap = new Map<
    string,
    {
      name: string;
      representativeId: string;
      linkedEventsCount: number;
      slots: (typeof data.availabilities)[number][];
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

  const availabilityGroups = [...availabilityGroupsMap.values()]
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

  const selectedGroup =
    availabilityGroups.find((group) => group.slots.some((slot) => String(slot._id) === availabilityId)) ?? null;

  if (!selectedGroup) {
    return (
      <section className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Disponibilidade nao encontrada</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/admin">Voltar</Link>
          </Button>
        </div>
      </section>
    );
  }

  const groupInput = [
    {
      name: selectedGroup.name,
      linkedEventsCount: selectedGroup.linkedEventsCount,
      slots: selectedGroup.slots.map((slot) => ({
        _id: String(slot._id),
        weekday: slot.weekday,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: slot.timezone,
        status: slot.status,
      })),
    },
  ];
  const availabilityOverrides = Array.isArray(data.availabilityOverrides)
    ? data.availabilityOverrides
    : [];
  const groupOverrides = availabilityOverrides
    .filter((override) => override.groupName === selectedGroup.name)
    .sort((a, b) => a.date.localeCompare(b.date, "pt-BR"))
    .map((override) => ({
      _id: String(override._id),
      date: override.date,
      timezone: override.timezone,
      allDayUnavailable: override.allDayUnavailable,
      slots: override.slots.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
      })),
    }));

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Editar horarios</h1>
          <p className="text-xs text-muted-foreground">{selectedGroup.name}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/admin">Voltar ao admin</Link>
        </Button>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Disponibilidade</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminAvailabilityEditor
            groups={groupInput}
            overridesByGroup={{ [selectedGroup.name]: groupOverrides }}
            showCreateButton={false}
          />
        </CardContent>
      </Card>
    </section>
  );
}
