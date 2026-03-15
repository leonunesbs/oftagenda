"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarDays,
  CalendarSync,
  CheckCircle2,
  Clock3,
  MoreHorizontal,
  UserRound,
  XCircle,
} from "lucide-react";
import { AdminCreateAppointmentDialog } from "@/components/admin-create-appointment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import {
  reservationStatusBadgeVariant,
  reservationStatusFilterOptions,
  reservationStatusLabel,
  type ReservationStatus,
} from "@/lib/reservation-status";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ReservationRow = {
  _id: string;
  clerkUserId: string;
  eventTypeId: string;
  eventTypeTitle: string;
  availabilityId: string;
  availabilityLabel: string;
  status: ReservationStatus;
  startsAt: number;
  notes?: string;
  kind: "consulta" | "exame" | "procedimento";
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
};

type EventTypeOption = {
  _id: string;
  name?: string;
  title: string;
  kind?: "consulta" | "procedimento" | "exame";
  availabilityId?: string;
  location: "fortaleza" | "sao_domingos_do_maranhao" | "fortuna";
  active: boolean;
};

type AvailabilityGroupOption = {
  name: string;
  representativeId: string;
};

type AdminReservationsManagerProps = {
  reservations: ReservationRow[];
  eventTypes: EventTypeOption[];
  availabilityGroups: AvailabilityGroupOption[];
  selectedStatus: "all" | ReservationStatus;
  searchQuery: string;
  stats: {
    total: number;
    pending: number;
    awaitingPatient: number;
    confirmed: number;
    inCare: number;
    surgeryPlanned: number;
    postopFollowup: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
};

const statusOptions = reservationStatusFilterOptions;

const kindClassName: Record<ReservationRow["kind"], string> = {
  consulta: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  exame: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  procedimento: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
};

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(timestamp));
}

export function AdminReservationsManager({
  reservations,
  eventTypes,
  availabilityGroups,
  selectedStatus,
  searchQuery,
  stats,
}: AdminReservationsManagerProps) {
  const buildFilterHref = (status: "all" | ReservationStatus) => {
    const params = new URLSearchParams();
    if (status !== "all") {
      params.set("status", status);
    }
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    const query = params.toString();
    return query ? `/dashboard/admin/reservas?${query}` : "/dashboard/admin/reservas";
  };

  const columns = useMemo<Array<ColumnDef<ReservationRow>>>(
    () => [
      {
        accessorKey: "eventTypeTitle",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Atendimento" />,
        cell: ({ row }) => {
          const reservation = row.original;
          return (
            <div className="space-y-1 whitespace-normal">
              <p className="font-medium">{reservation.eventTypeTitle}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={kindClassName[reservation.kind]}>{reservation.kind}</Badge>
                <span className="text-xs text-muted-foreground">{reservation.availabilityLabel}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "patientName",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Paciente" />,
        cell: ({ row }) => {
          const reservation = row.original;
          return (
            <div className="space-y-0.5 whitespace-normal">
              <p className="font-medium">{reservation.patientName ?? "Sem nome"}</p>
              <p className="text-xs text-muted-foreground">{reservation.patientEmail ?? "sem e-mail"}</p>
              <p className="text-xs text-muted-foreground">{reservation.patientPhone ?? "sem telefone"}</p>
              <p className="text-xs text-muted-foreground">{reservation.clerkUserId}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "startsAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Data/Hora" />,
        cell: ({ row }) => {
          const reservation = row.original;
          return (
            <div className="space-y-0.5 whitespace-normal">
              <p className="font-medium">{formatDateTime(reservation.startsAt)}</p>
              <p className="text-xs text-muted-foreground">{reservation.notes ?? "Sem observações"}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const reservation = row.original;
          return (
            <Badge variant={reservationStatusBadgeVariant[reservation.status]}>
              {reservationStatusLabel[reservation.status]}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        enableSorting: false,
        header: "Ações",
        cell: ({ row }) => {
          const reservation = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon-sm" variant="ghost" className="data-[state=open]:bg-muted">
                  <span className="sr-only">Abrir menu</span>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações da reserva</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/admin/reservas/reagendar/${reservation._id}`}>
                      <CalendarSync className="size-4" />
                      Reagendar e atualizar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/admin/reservas/status/${reservation._id}`}>
                      <CheckCircle2 className="size-4" />
                      Atualizar status
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" asChild>
                    <Link href={`/dashboard/admin/reservas/cancelar/${reservation._id}`}>
                      <XCircle className="size-4" />
                      Cancelar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/admin/reservas/contato/${reservation._id}`}>
                      <UserRound className="size-4" />
                      Contato do paciente
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  const safeTotal = stats.total > 0 ? stats.total : 1;
  const statsCards = [
    {
      title: "Total",
      value: stats.total,
      icon: CalendarDays,
      tone: "text-primary",
      ratio: 100,
      helper: "Visão geral das reservas",
    },
    {
      title: "Pendentes",
      value: stats.pending,
      icon: Clock3,
      tone: "text-amber-600",
      ratio: Math.round((stats.pending / safeTotal) * 100),
      helper: "Necessitam confirmação",
    },
    {
      title: "Aguardando paciente",
      value: stats.awaitingPatient,
      icon: Clock3,
      tone: "text-amber-600",
      ratio: Math.round((stats.awaitingPatient / safeTotal) * 100),
      helper: "Em retorno/contato",
    },
    {
      title: "Confirmadas",
      value: stats.confirmed,
      icon: CheckCircle2,
      tone: "text-emerald-600",
      ratio: Math.round((stats.confirmed / safeTotal) * 100),
      helper: "Prontas para atendimento",
    },
    {
      title: "Em atendimento",
      value: stats.inCare,
      icon: CheckCircle2,
      tone: "text-emerald-600",
      ratio: Math.round((stats.inCare / safeTotal) * 100),
      helper: "Paciente em acompanhamento",
    },
    {
      title: "Cirurgia planejada",
      value: stats.surgeryPlanned,
      icon: CalendarSync,
      tone: "text-primary",
      ratio: Math.round((stats.surgeryPlanned / safeTotal) * 100),
      helper: "Planejamento cirúrgico",
    },
    {
      title: "Pós-operatório",
      value: stats.postopFollowup,
      icon: CalendarSync,
      tone: "text-primary",
      ratio: Math.round((stats.postopFollowup / safeTotal) * 100),
      helper: "Acompanhamento pós-cirúrgico",
    },
    {
      title: "Concluídas",
      value: stats.completed,
      icon: CheckCircle2,
      tone: "text-primary",
      ratio: Math.round((stats.completed / safeTotal) * 100),
      helper: "Ciclo finalizado",
    },
    {
      title: "Canceladas",
      value: stats.cancelled,
      icon: XCircle,
      tone: "text-destructive",
      ratio: Math.round((stats.cancelled / safeTotal) * 100),
      helper: "Comunicadas ao paciente",
    },
    {
      title: "No-show",
      value: stats.noShow,
      icon: XCircle,
      tone: "text-destructive",
      ratio: Math.round((stats.noShow / safeTotal) * 100),
      helper: "Não compareceram",
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((item) => (
          <Card key={item.title} variant="flat-mobile" className="border-border/70">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.title}</p>
                <item.icon className={`size-4 ${item.tone}`} />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-semibold leading-none">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.helper}</p>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 rounded-full bg-muted">
                  <div
                    className={`h-1.5 rounded-full ${item.title === "Canceladas" || item.title === "No-show" ? "bg-destructive/70" : "bg-primary/70"}`}
                    style={{ width: `${item.ratio}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{item.ratio}% do total</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card variant="flat-mobile" className="border-border/70">
        <CardHeader>
          <CardTitle>Operação de reservas</CardTitle>
          <CardDescription>
            Gerencie marcações, reagendamentos e cancelamentos com atalhos de contato e notificação por e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? "default" : "outline"}
                    size="sm"
                    asChild
                  >
                    <Link href={buildFilterHref(status)}>
                      {status === "all" ? "Todos" : reservationStatusLabel[status]}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
            <form method="get" className="grid min-w-64 flex-1 gap-1.5">
              {selectedStatus !== "all" ? <input type="hidden" name="status" value={selectedStatus} /> : null}
              <Label htmlFor="reservas-q">Busca</Label>
              <div className="flex gap-2">
                <input
                  id="reservas-q"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Paciente, e-mail, telefone, evento ou observação"
                  className="h-9 w-full rounded-md border border-input bg-input/20 px-3 text-sm"
                />
                <Button type="submit" variant="outline" size="sm">
                  Aplicar
                </Button>
              </div>
            </form>
            <AdminCreateAppointmentDialog
              eventTypes={eventTypes}
              availabilityGroups={availabilityGroups}
              triggerLabel="Nova marcação assistida"
            />
          </div>

          <DataTable
            columns={columns}
            data={reservations}
            emptyMessage="Nenhuma reserva encontrada para os filtros aplicados."
          />
        </CardContent>
      </Card>
    </div>
  );
}
