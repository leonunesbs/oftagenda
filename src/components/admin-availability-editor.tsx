"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ptBR } from "date-fns/locale";

import {
  deleteAvailabilityDateOverrideAction,
  upsertAvailabilityDateOverridesAction,
  upsertAvailabilityDaySlotsAction,
} from "@/app/dashboard/admin/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const weekdayLongLabels = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

type SlotInputState = {
  availabilityId?: string;
  startTime: string;
  endTime: string;
  status: "active" | "inactive";
};

type GroupInput = {
  name: string;
  linkedEventsCount: number;
  slots: Array<{
    _id: string;
    weekday: number;
    startTime: string;
    endTime: string;
    timezone: string;
    status: "active" | "inactive";
  }>;
};

type OverrideInput = {
  _id: string;
  date: string;
  timezone: string;
  allDayUnavailable: boolean;
  slots: Array<{
    startTime: string;
    endTime: string;
    status: "active" | "inactive";
  }>;
};

type GroupState = {
  originalName: string;
  name: string;
  linkedEventsCount: number;
  timezone: string;
  days: Array<{
    enabled: boolean;
    allowMultiple: boolean;
    slots: SlotInputState[];
  }>;
};

function createDefaultSlot(): SlotInputState {
  return {
    startTime: "09:00",
    endTime: "17:00",
    status: "active",
  };
}

function buildInitialGroups(groups: GroupInput[]): GroupState[] {
  return groups.map((group) => {
    const days = Array.from({ length: 7 }, () => ({
      enabled: false,
      allowMultiple: false,
      slots: [] as SlotInputState[],
    }));
    const groupTimezone = group.slots[0]?.timezone || "America/Fortaleza";

    for (const slot of group.slots) {
      if (slot.weekday < 0 || slot.weekday > 6) {
        continue;
      }
      const targetDay = days[slot.weekday];
      if (!targetDay) {
        continue;
      }
      targetDay.slots.push({
        availabilityId: slot._id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: slot.status,
      });
    }

    const hydratedDays = days.map((day) => {
      if (day.slots.length === 0) {
        return {
          ...day,
          enabled: false,
          allowMultiple: false,
          slots: [{ ...createDefaultSlot(), status: "inactive" as const }],
        };
      }
      return {
        ...day,
        enabled: day.slots.some((slot) => slot.status === "active"),
        allowMultiple: day.slots.length > 1,
      };
    });

    return {
      originalName: group.name,
      name: group.name,
      linkedEventsCount: group.linkedEventsCount,
      timezone: groupTimezone,
      days: hydratedDays,
    };
  });
}

export function AdminAvailabilityEditor({
  groups,
  overridesByGroup = {},
  showCreateButton = true,
}: {
  groups: GroupInput[];
  overridesByGroup?: Record<string, OverrideInput[]>;
  showCreateButton?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isOverridePending, startOverrideTransition] = useTransition();
  const [groupStates, setGroupStates] = useState<GroupState[]>(() => buildInitialGroups(groups));
  const [saveFeedback, setSaveFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [overrideGroupIndex, setOverrideGroupIndex] = useState<number | null>(null);
  const [overrideDates, setOverrideDates] = useState<Date[]>([]);
  const [overrideSlots, setOverrideSlots] = useState<SlotInputState[]>([{ ...createDefaultSlot() }]);
  const [overrideAllDayUnavailable, setOverrideAllDayUnavailable] = useState(false);
  const [overrideFeedback, setOverrideFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deletingOverrideId, setDeletingOverrideId] = useState<string | null>(null);

  const hasGroups = groupStates.length > 0;
  const selectClassName = "h-9 rounded-md border border-input bg-input/20 px-2 text-xs";

  const flattenedDayCount = useMemo(
    () => groupStates.reduce((total, group) => total + group.days.filter((day) => day.enabled).length, 0),
    [groupStates],
  );

  function updateDay(
    groupIndex: number,
    weekday: number,
    updater: (day: GroupState["days"][number]) => GroupState["days"][number],
  ) {
    setGroupStates((previous) =>
      previous.map((group, currentGroupIndex) => {
        if (currentGroupIndex !== groupIndex) {
          return group;
        }
        const nextDays = group.days.map((day, currentWeekday) => {
          if (currentWeekday !== weekday) {
            return day;
          }
          return updater(day);
        });
        return {
          ...group,
          days: nextDays,
        };
      }),
    );
  }

  function addSlot(groupIndex: number, weekday: number) {
    updateDay(groupIndex, weekday, (day) => ({
      ...day,
      enabled: true,
      slots: [...day.slots, createDefaultSlot()],
    }));
  }

  function removeSlot(groupIndex: number, weekday: number, slotIndex: number) {
    updateDay(groupIndex, weekday, (day) => ({
      ...day,
      slots: day.slots.filter((_, index) => index !== slotIndex),
    }));
  }

  function updateSlot(
    groupIndex: number,
    weekday: number,
    slotIndex: number,
    patch: Partial<SlotInputState>,
  ) {
    updateDay(groupIndex, weekday, (day) => ({
      ...day,
      slots: day.slots.map((slot, index) => (index === slotIndex ? { ...slot, ...patch } : slot)),
    }));
  }

  function updateGroupTimezone(groupIndex: number, timezone: string) {
    setGroupStates((previous) =>
      previous.map((group, index) => (index === groupIndex ? { ...group, timezone } : group)),
    );
  }

  function updateGroupName(groupIndex: number, name: string) {
    setGroupStates((previous) =>
      previous.map((group, index) => (index === groupIndex ? { ...group, name } : group)),
    );
  }

  function setDayEnabled(groupIndex: number, weekday: number, enabled: boolean) {
    updateDay(groupIndex, weekday, (day) => {
      const currentSlots = day.slots.length > 0 ? day.slots : [createDefaultSlot()];
      if (!enabled) {
        return {
          ...day,
          enabled: false,
          slots: currentSlots.map((slot) => ({ ...slot, status: "inactive" as const })),
        };
      }
      return {
        ...day,
        enabled: true,
        slots: currentSlots.map((slot) => ({ ...slot, status: "active" as const })),
      };
    });
  }

  function setAllowMultiple(groupIndex: number, weekday: number, allowMultiple: boolean) {
    updateDay(groupIndex, weekday, (day) => ({
      ...day,
      allowMultiple,
      slots: allowMultiple ? day.slots : day.slots.slice(0, 1),
    }));
  }

  function openOverrideDialog(groupIndex: number) {
    setOverrideGroupIndex(groupIndex);
    setOverrideDates([]);
    setOverrideSlots([{ ...createDefaultSlot() }]);
    setOverrideAllDayUnavailable(false);
    setOverrideFeedback(null);
  }

  function closeOverrideDialog() {
    setOverrideGroupIndex(null);
    setOverrideFeedback(null);
  }

  function updateOverrideSlot(slotIndex: number, patch: Partial<SlotInputState>) {
    setOverrideSlots((previous) =>
      previous.map((slot, index) => (index === slotIndex ? { ...slot, ...patch } : slot)),
    );
  }

  function addOverrideSlot() {
    setOverrideSlots((previous) => [...previous, { ...createDefaultSlot() }]);
  }

  function removeOverrideSlot(slotIndex: number) {
    setOverrideSlots((previous) => previous.filter((_, index) => index !== slotIndex));
  }

  function handleOverrideDatesChange(nextDates: Date[] | undefined) {
    const normalized =
      nextDates?.map((date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0)) ?? [];
    const uniqueByIso = new Map(normalized.map((date) => [toIsoDate(date), date]));
    setOverrideDates([...uniqueByIso.values()].sort((a, b) => a.getTime() - b.getTime()));
  }

  function saveOverrides() {
    if (overrideGroupIndex === null) {
      return;
    }
    const group = groupStates[overrideGroupIndex];
    if (!group) {
      return;
    }
    if (overrideDates.length === 0) {
      setOverrideFeedback({ type: "error", message: "Selecione pelo menos uma data para substituir." });
      return;
    }
    if (!overrideAllDayUnavailable && overrideSlots.length === 0) {
      setOverrideFeedback({ type: "error", message: "Adicione pelo menos um horário para a substituição." });
      return;
    }

    setOverrideFeedback(null);
    startOverrideTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("groupName", group.originalName);
        formData.set("timezone", group.timezone || "America/Fortaleza");
        formData.set("allDayUnavailable", String(overrideAllDayUnavailable));
        formData.set("dates", JSON.stringify(overrideDates.map((date) => toIsoDate(date))));
        formData.set(
          "slots",
          JSON.stringify(
            overrideSlots.map((slot) => ({
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: slot.status,
            })),
          ),
        );
        await upsertAvailabilityDateOverridesAction(formData);
        setOverrideFeedback({ type: "success", message: "Substituição salva com sucesso." });
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao salvar substituição.";
        setOverrideFeedback({ type: "error", message });
      }
    });
  }

  function deleteOverride(overrideId: string) {
    const shouldDelete = window.confirm("Tem certeza de que deseja excluir esta substituição de data?");
    if (!shouldDelete) {
      return;
    }

    setDeletingOverrideId(overrideId);
    startOverrideTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("overrideId", overrideId);
        await deleteAvailabilityDateOverrideAction(formData);
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao excluir substituição por data.";
        setOverrideFeedback({ type: "error", message });
      } finally {
        setDeletingOverrideId(null);
      }
    });
  }

  function saveAllAvailabilities() {
    if (groupStates.length === 0) {
      return;
    }

    const normalizedGroupNames = groupStates.map((group) => group.name.trim()).filter(Boolean);
    if (normalizedGroupNames.length !== groupStates.length) {
      setSaveFeedback({ type: "error", message: "Informe um nome para cada disponibilidade." });
      return;
    }
    if (new Set(normalizedGroupNames).size !== normalizedGroupNames.length) {
      setSaveFeedback({ type: "error", message: "Os nomes das disponibilidades devem ser únicos." });
      return;
    }

    setSaveFeedback(null);
    startTransition(async () => {
      try {
        const saveRequests: Promise<unknown>[] = [];
        let totalDays = 0;
        for (const group of groupStates) {
          const normalizedGroupName = group.name.trim();
          group.days.forEach((day, weekday) => {
            const formData = new FormData();
            formData.set("groupName", normalizedGroupName);
            formData.set("previousGroupName", group.originalName);
            formData.set("weekday", String(weekday));
            formData.set("timezone", group.timezone || "America/Fortaleza");
            formData.set(
              "slots",
              JSON.stringify(
                (day.slots.length > 0 ? day.slots : [{ ...createDefaultSlot(), status: "inactive" as const }]).map(
                  (slot) => ({
                    availabilityId: slot.availabilityId,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    status: day.enabled ? slot.status : "inactive",
                  }),
                ),
              ),
            );
            saveRequests.push(upsertAvailabilityDaySlotsAction(formData));
            totalDays += 1;
          });
        }

        await Promise.all(saveRequests);
        setSaveFeedback({
          type: "success",
          message: `${totalDays} dia(s) salvo(s) com sucesso.`,
        });
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Falha ao salvar as disponibilidades.";
        setSaveFeedback({ type: "error", message });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Dias com faixas configuradas: {flattenedDayCount}. Use o botão + Horário para adicionar novos horários no
          mesmo dia.
        </p>
        <div className="flex items-center gap-2">
          {showCreateButton ? (
            <Button size="sm" asChild>
              <Link href="/dashboard/admin/nova-disponibilidade">Nova disponibilidade</Link>
            </Button>
          ) : null}
          <Button size="sm" type="button" onClick={saveAllAvailabilities} disabled={isPending || !hasGroups}>
            {isPending ? "Salvando tudo..." : "Salvar todas as disponibilidades"}
          </Button>
        </div>
      </div>
      {saveFeedback ? (
        <p className={`text-xs ${saveFeedback.type === "error" ? "text-destructive" : "text-muted-foreground"}`}>
          {saveFeedback.message}
        </p>
      ) : null}

      {!hasGroups ? <p className="text-xs text-muted-foreground">Crie uma disponibilidade para começar.</p> : null}

      {groupStates.map((group, groupIndex) => (
        <div
          key={`availability-editor-${group.originalName}-${groupIndex}`}
          className="space-y-4 rounded-lg border border-border/70 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Nome da disponibilidade</p>
              <Input
                value={group.name}
                onChange={(event) => updateGroupName(groupIndex, event.target.value)}
                className="h-8 w-64 max-w-full"
                placeholder="Nome da disponibilidade"
                aria-label={`Nome da disponibilidade ${group.originalName}`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" type="button" onClick={() => openOverrideDialog(groupIndex)}>
                Substituir datas
              </Button>
              <Input
                value={group.timezone}
                onChange={(event) => updateGroupTimezone(groupIndex, event.target.value)}
                className="h-8 w-52"
                placeholder="Fuso horário"
                aria-label={`Fuso horário da disponibilidade ${group.originalName}`}
              />
              <p className="text-[11px] text-muted-foreground">
                Vinculado a {group.linkedEventsCount.toString()} evento(s)
              </p>
            </div>
          </div>
          {(overridesByGroup[group.originalName] ?? []).length > 0 ? (
            <div className="space-y-2 rounded-lg border border-border/70 bg-muted/10 p-3">
              <p className="text-xs font-medium">Substituições por data</p>
              <div className="flex flex-wrap gap-2">
                {(overridesByGroup[group.originalName] ?? []).slice(0, 12).map((override) => (
                  <div
                    key={`override-chip-${group.originalName}-${override._id}`}
                    className="flex items-center gap-2 rounded-full border border-border/70 px-2 py-1 text-[11px] text-muted-foreground"
                  >
                    <span>
                      {formatIsoDate(override.date)}{" "}
                      {override.allDayUnavailable ? "(indisponível)" : `${override.slots.length} faixa(s)`}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deleteOverride(override._id)}
                      disabled={isOverridePending && deletingOverrideId === override._id}
                    >
                      {isOverridePending && deletingOverrideId === override._id ? "Removendo..." : "Remover"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-3 lg:grid-cols-2">
            {group.days.map((day, weekday) => {
            const dayKey = `${group.originalName}-${weekday}`;

            return (
              <div key={dayKey} className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Switch
                      checked={day.enabled}
                      onCheckedChange={(checked) => setDayEnabled(groupIndex, weekday, Boolean(checked))}
                    />
                    <p className="text-sm font-medium">{weekdayLongLabels[weekday]}</p>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    {day.enabled ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={day.allowMultiple}
                          onCheckedChange={(checked) =>
                            setAllowMultiple(groupIndex, weekday, Boolean(checked))
                          }
                        />
                        <p className="text-xs text-muted-foreground">Múltiplos horários</p>
                      </div>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      className="w-full sm:w-auto"
                      onClick={() => addSlot(groupIndex, weekday)}
                      disabled={!day.enabled || !day.allowMultiple}
                    >
                      + Horário
                    </Button>
                  </div>
                </div>

                {!day.enabled ? (
                  <p className="text-xs text-muted-foreground">Dia inativo.</p>
                ) : null}

                {day.enabled && day.slots.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Sem horários para este dia. Clique em + Horário para adicionar.
                  </p>
                ) : null}

                {day.enabled &&
                  day.slots.map((slot, slotIndex) => (
                  <div
                    key={`${dayKey}-slot-${slotIndex}`}
                    className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(140px,170px)_20px_minmax(140px,170px)_140px_110px]"
                  >
                    <Input
                      type="time"
                      step={300}
                      value={slot.startTime}
                      className="h-9 w-full text-sm"
                      onChange={(event) =>
                        updateSlot(groupIndex, weekday, slotIndex, { startTime: event.target.value })
                      }
                      title="Use formato 24h (HH:mm)"
                      aria-label={`Início ${weekdayLongLabels[weekday]} ${slotIndex + 1}`}
                    />
                    <span className="hidden text-center text-sm text-muted-foreground xl:block">-</span>
                    <Input
                      type="time"
                      step={300}
                      value={slot.endTime}
                      className="h-9 w-full text-sm"
                      onChange={(event) => updateSlot(groupIndex, weekday, slotIndex, { endTime: event.target.value })}
                      title="Use formato 24h (HH:mm)"
                      aria-label={`Fim ${weekdayLongLabels[weekday]} ${slotIndex + 1}`}
                    />
                    <select
                      className={`${selectClassName} w-full`}
                      value={slot.status}
                      onChange={(event) =>
                        updateSlot(groupIndex, weekday, slotIndex, {
                          status: event.target.value as "active" | "inactive",
                        })
                      }
                      aria-label={`Status ${weekdayLongLabels[weekday]} ${slotIndex + 1}`}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => removeSlot(groupIndex, weekday, slotIndex)}
                      disabled={!day.allowMultiple || day.slots.length === 1}
                    >
                      Remover
                    </Button>
                  </div>
                  ))}

              </div>
            );
            })}
          </div>
        </div>
      ))}
      <Dialog open={overrideGroupIndex !== null} onOpenChange={(open) => (!open ? closeOverrideDialog() : null)}>
        <DialogContent className="max-h-[90vh] max-w-[96vw] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Substituir datas selecionadas</DialogTitle>
            <DialogDescription>
              Selecione uma ou mais datas para substituir os horários da disponibilidade.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-3">
              <p className="text-sm font-medium">Datas da substituição</p>
              <Calendar
                mode="multiple"
                locale={ptBR}
                selected={overrideDates}
                onSelect={handleOverrideDatesChange}
                className="w-full [--cell-size:clamp(1.95rem,6vw,2.5rem)]"
              />
              {overrideDates.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {overrideDates.length} data(s) selecionada(s):{" "}
                  {overrideDates.map((date) => formatIsoDate(toIsoDate(date))).join(", ")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhuma data selecionada.</p>
              )}
            </div>
            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-3">
              <p className="text-sm font-medium">Horários para substituição</p>
              <div className="flex items-center gap-2">
                <Switch
                  checked={overrideAllDayUnavailable}
                  onCheckedChange={(checked) => setOverrideAllDayUnavailable(Boolean(checked))}
                />
                <p className="text-sm">Marcar indisponível (o dia todo)</p>
              </div>
              {!overrideAllDayUnavailable
                ? overrideSlots.map((slot, slotIndex) => (
                    <div
                      key={`override-slot-${slotIndex}`}
                      className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(120px,1fr)_20px_minmax(120px,1fr)_120px_100px]"
                    >
                      <Input
                        type="time"
                        step={300}
                        value={slot.startTime}
                        className="h-9"
                        onChange={(event) =>
                          updateOverrideSlot(slotIndex, {
                            startTime: event.target.value,
                          })
                        }
                      />
                      <span className="hidden text-center text-sm text-muted-foreground sm:block">-</span>
                      <Input
                        type="time"
                        step={300}
                        value={slot.endTime}
                        className="h-9"
                        onChange={(event) =>
                          updateOverrideSlot(slotIndex, {
                            endTime: event.target.value,
                          })
                        }
                      />
                      <select
                        className={`${selectClassName} w-full`}
                        value={slot.status}
                        onChange={(event) =>
                          updateOverrideSlot(slotIndex, {
                            status: event.target.value as "active" | "inactive",
                          })
                        }
                      >
                        <option value="active">Ativo</option>
                        <option value="inactive">Inativo</option>
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => removeOverrideSlot(slotIndex)}
                        disabled={overrideSlots.length === 1}
                      >
                        Remover
                      </Button>
                    </div>
                  ))
                : null}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addOverrideSlot}
                disabled={overrideAllDayUnavailable}
              >
                + Horário
              </Button>
              {overrideFeedback ? (
                <p className={`text-xs ${overrideFeedback.type === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                  {overrideFeedback.message}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeOverrideDialog}>
              Fechar
            </Button>
            <Button type="button" onClick={saveOverrides} disabled={isOverridePending}>
              {isOverridePending ? "Salvando..." : "Salvar substituição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDate(isoDate: string) {
  const parts = isoDate.split("-");
  const year = Number(parts[0] ?? "1970");
  const month = Number(parts[1] ?? "1");
  const day = Number(parts[2] ?? "1");
  const safeYear = Number.isFinite(year) ? year : 1970;
  const safeMonth = Number.isFinite(month) ? month : 1;
  const safeDay = Number.isFinite(day) ? day : 1;
  return new Date(safeYear, safeMonth - 1, safeDay, 12, 0, 0);
}

function formatIsoDate(isoDate: string) {
  const date = parseIsoDate(isoDate);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
