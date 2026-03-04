import Link from "next/link";
import { buildAvailabilityGroups, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminAvailabilityPage() {
  const data = await getAdminSnapshot();
  const availabilityGroups = buildAvailabilityGroups(data);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Disponibilidade</CardTitle>
        <CardDescription>Visualize disponibilidades cadastradas e abra a edição de horários.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button size="sm" asChild>
            <Link href="/dashboard/admin/nova-disponibilidade">Nova disponibilidade</Link>
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          {availabilityGroups.map((group) => (
            <div key={`availability-card-${group.representativeId}`} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{group.name}</p>
              <p className="text-xs text-muted-foreground">
                {group.slots.length} faixa(s) - {group.slots[0]?.timezone ?? "sem timezone"}
              </p>
              <p className="text-xs text-muted-foreground">
                Vinculado a {group.linkedEventsCount.toString()} evento(s)
              </p>
              <Button className="mt-3" size="sm" variant="outline" asChild>
                <Link href={`/dashboard/admin/disponibilidade/${group.representativeId}`}>Editar horários</Link>
              </Button>
            </div>
          ))}
        </div>
        {availabilityGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma disponibilidade cadastrada.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
