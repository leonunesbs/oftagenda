"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { upsertAvailabilityDaySlotsAction } from "@/app/dashboard/admin/actions";
import { Button } from "@/components/ui/button";
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
  "Terca-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sabado",
];

type SlotInputState = {
  startTime: string;
  endTime: string;
  status: "active" | "inactive";
};

type NewDayState = {
  enabled: boolean;
  allowMultiple: boolean;
  slots: SlotInputState[];
};

function createDefaultSlot(): SlotInputState {
  return {
    startTime: "09:00",
    endTime: "17:00",
    status: "active",
  };
}

function createWeeklyTemplate(): NewDayState[] {
  return Array.from({ length: 7 }, () => ({
    enabled: true,
    allowMultiple: false,
    slots: [createDefaultSlot()],
  }));
}

export function AdminAvailabilityCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [groupName, setGroupName] = useState("");
  const [groupTimezone, setGroupTimezone] = useState("America/Fortaleza");
  const [days, setDays] = useState<NewDayState[]>(createWeeklyTemplate);
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectClassName = "h-9 rounded-md border border-input bg-input/20 px-2 text-xs";

  function resetForm() {
    setGroupName("");
    setGroupTimezone("America/Fortaleza");
    setDays(createWeeklyTemplate());
    setFeedback(null);
  }

  function updateDay(weekday: number, updater: (day: NewDayState) => NewDayState) {
    setDays((previous) => previous.map((day, index) => (index === weekday ? updater(day) : day)));
  }

  function setDayEnabled(weekday: number, enabled: boolean) {
    updateDay(weekday, (day) => {
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

  function setAllowMultiple(weekday: number, allowMultiple: boolean) {
    updateDay(weekday, (day) => ({
      ...day,
      allowMultiple,
      slots: allowMultiple ? day.slots : day.slots.slice(0, 1),
    }));
  }

  function addSlot(weekday: number) {
    updateDay(weekday, (day) => ({
      ...day,
      enabled: true,
      slots: [...day.slots, createDefaultSlot()],
    }));
  }

  function removeSlot(weekday: number, slotIndex: number) {
    updateDay(weekday, (day) => ({
      ...day,
      slots: day.slots.filter((_, index) => index !== slotIndex),
    }));
  }

  function updateSlot(weekday: number, slotIndex: number, patch: Partial<SlotInputState>) {
    updateDay(weekday, (day) => ({
      ...day,
      slots: day.slots.map((slot, index) => (index === slotIndex ? { ...slot, ...patch } : slot)),
    }));
  }

  function handleClose() {
    onOpenChange(false);
  }

  function handleSave() {
    const normalizedName = groupName.trim();
    if (!normalizedName) {
      setFeedback("Informe o nome da disponibilidade.");
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      try {
        for (let weekday = 0; weekday < days.length; weekday += 1) {
          const day = days[weekday];
          if (!day) {
            continue;
          }
          const formData = new FormData();
          formData.set("groupName", normalizedName);
          formData.set("weekday", String(weekday));
          formData.set("timezone", groupTimezone.trim() || "America/Fortaleza");
          formData.set(
            "slots",
            JSON.stringify(
              (day.slots.length > 0 ? day.slots : [{ ...createDefaultSlot(), status: "inactive" as const }]).map(
                (slot) => ({
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  status: day.enabled ? slot.status : "inactive",
                }),
              ),
            ),
          );
          await upsertAvailabilityDaySlotsAction(formData);
        }
        resetForm();
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Falha ao criar disponibilidade.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Cadastrar disponibilidade</DialogTitle>
          <DialogDescription>
            Defina o nome e ative os dias da semana com Switch. Em cada dia ativo, configure um ou varios horarios.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
            placeholder="Ex.: Manha clinica / Semana A"
          />
          <Input
            value={groupTimezone}
            onChange={(event) => setGroupTimezone(event.target.value)}
            placeholder="Timezone unica (ex.: America/Fortaleza)"
          />
          <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
            {days.map((day, weekday) => (
              <div key={`new-day-${weekday}`} className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Switch checked={day.enabled} onCheckedChange={(checked) => setDayEnabled(weekday, Boolean(checked))} />
                    <p className="text-sm font-medium">{weekdayLongLabels[weekday]}</p>
                  </div>
                  {day.enabled ? (
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      <Switch
                        checked={day.allowMultiple}
                        onCheckedChange={(checked) => setAllowMultiple(weekday, Boolean(checked))}
                      />
                      <p className="text-xs text-muted-foreground">Multiplos horarios</p>
                    </div>
                  ) : null}
                </div>
                {day.enabled
                  ? day.slots.map((slot, slotIndex) => (
                      <div
                        key={`new-day-${weekday}-slot-${slotIndex}`}
                        className="grid grid-cols-1 items-center gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(140px,170px)_20px_minmax(140px,170px)_140px_110px]"
                      >
                        <Input
                          type="time"
                          step={300}
                          value={slot.startTime}
                          className="h-9 w-full text-sm"
                          onChange={(event) => updateSlot(weekday, slotIndex, { startTime: event.target.value })}
                          title="Use formato 24h (HH:mm)"
                        />
                        <span className="hidden text-center text-sm text-muted-foreground xl:block">-</span>
                        <Input
                          type="time"
                          step={300}
                          value={slot.endTime}
                          className="h-9 w-full text-sm"
                          onChange={(event) => updateSlot(weekday, slotIndex, { endTime: event.target.value })}
                          title="Use formato 24h (HH:mm)"
                        />
                        <select
                          className={`${selectClassName} w-full`}
                          value={slot.status}
                          onChange={(event) =>
                            updateSlot(weekday, slotIndex, { status: event.target.value as "active" | "inactive" })
                          }
                        >
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeSlot(weekday, slotIndex)}
                          disabled={day.slots.length === 1}
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
                  className="w-full sm:w-auto"
                  onClick={() => addSlot(weekday)}
                  disabled={!day.enabled || !day.allowMultiple}
                >
                  + Horario
                </Button>
              </div>
            ))}
          </div>
          {feedback ? <p className="text-xs text-destructive">{feedback}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar disponibilidade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
