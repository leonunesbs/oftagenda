import Link from "next/link";
import { buildAvailabilityGroups, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { AdminAvailabilityEditor } from "@/components/admin-availability-editor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AvailabilityDetailsPage({
  params,
}: {
  params: Promise<{ availabilityId: string }>;
}) {
  const { availabilityId } = await params;
  const data = await getAdminSnapshot();
  const availabilityGroups = buildAvailabilityGroups(data);

  const selectedGroup =
    availabilityGroups.find((group) => group.slots.some((slot) => String(slot._id) === availabilityId)) ?? null;

  if (!selectedGroup) {
    return (
      <section className="mx-auto w-full max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Disponibilidade nao encontrada</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/admin/disponibilidade">Voltar</Link>
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
          <Link href="/dashboard/admin/disponibilidade">Voltar para disponibilidade</Link>
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
