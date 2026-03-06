import Link from "next/link";
import { buildAvailabilityGroups, getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead>Faixas</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Eventos vinculados</TableHead>
                <TableHead className="w-[140px]">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availabilityGroups.map((group) => (
                <TableRow key={`availability-row-${group.representativeId}`}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.slots.length}</TableCell>
                  <TableCell>{group.slots[0]?.timezone ?? "sem timezone"}</TableCell>
                  <TableCell>{group.linkedEventsCount.toString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/dashboard/admin/disponibilidade/${group.representativeId}`}>Editar horários</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {availabilityGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma disponibilidade cadastrada.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
