"use client";

import { useMemo, useState } from "react";
import { adminCreateAppointmentAction } from "@/app/dashboard/admin/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";

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

type AdminCreateAppointmentFormProps = {
  eventTypes: EventTypeOption[];
  availabilityGroups: AvailabilityGroupOption[];
  initialDate?: string;
  initialTime?: string;
};

const selectClassName = "h-8 w-full rounded-md border border-input bg-input/20 px-2 text-xs";
const ddiOptions = [
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+1", country: "Estados Unidos", flag: "🇺🇸" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+34", country: "Espanha", flag: "🇪🇸" },
  { code: "+44", country: "Reino Unido", flag: "🇬🇧" },
] as const;

function parseIsoDate(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
}

function toIsoDate(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(value);
}

function buildTimeOptions() {
  const options: string[] = [];
  for (let hour = 7; hour <= 20; hour += 1) {
    options.push(`${String(hour).padStart(2, "0")}:00`);
    if (hour < 20) {
      options.push(`${String(hour).padStart(2, "0")}:30`);
    }
  }
  return options;
}

function formatPhoneWithDddMask(digits: string) {
  const normalized = digits.replace(/\D/g, "").slice(0, 11);
  if (normalized.length <= 2) {
    return normalized;
  }
  if (normalized.length <= 6) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2)}`;
  }
  if (normalized.length <= 10) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 6)}-${normalized.slice(6)}`;
  }
  return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
}

export function AdminCreateAppointmentForm({
  eventTypes,
  availabilityGroups,
  initialDate,
  initialTime,
}: AdminCreateAppointmentFormProps) {
  const activeEventTypes = eventTypes.filter((eventType) => eventType.active);
  const defaultEventTypeId = activeEventTypes[0]?._id ?? "";
  const defaultAvailabilityId =
    activeEventTypes[0]?.availabilityId ?? availabilityGroups[0]?.representativeId ?? "";
  const [selectedDate, setSelectedDate] = useState<Date>(() => parseIsoDate(initialDate) ?? new Date());
  const [selectedTime, setSelectedTime] = useState(initialTime && /^\d{2}:\d{2}$/.test(initialTime) ? initialTime : "08:00");
  const [selectedDdi, setSelectedDdi] = useState("+55");
  const [phoneWithMask, setPhoneWithMask] = useState("");

  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const eventTypeOptions = useMemo(
    () =>
      activeEventTypes.map((eventType) => ({
        value: eventType._id,
        label: eventType.name ?? eventType.title,
        kind: eventType.kind ?? "consulta",
      })),
    [activeEventTypes],
  );
  const phoneDigits = phoneWithMask.replace(/\D/g, "").slice(0, 11);
  const normalizedPhone = phoneDigits ? `${selectedDdi}${phoneDigits}` : "";

  return (
    <form action={adminCreateAppointmentAction} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="create-clerkUserId">Clerk User ID (opcional)</Label>
        <Input id="create-clerkUserId" name="clerkUserId" placeholder="user_..." />
      </div>

      <div className="grid gap-1.5 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="create-name">Nome</Label>
          <Input id="create-name" name="name" required placeholder="Nome do paciente" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="create-phone">Telefone (com DDD)</Label>
          <input type="hidden" name="phone" value={normalizedPhone} required />
          <div className="flex gap-2">
            <select
              aria-label="DDI"
              className={cn(selectClassName, "w-44")}
              value={selectedDdi}
              onChange={(event) => setSelectedDdi(event.target.value)}
            >
              {ddiOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.flag} {option.country} ({option.code})
                </option>
              ))}
            </select>
            <Input
              id="create-phone"
              value={phoneWithMask}
              onChange={(event) => setPhoneWithMask(formatPhoneWithDddMask(event.target.value))}
              required
              placeholder="(99) 99999-9999"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="create-email">E-mail</Label>
        <Input id="create-email" name="email" required type="email" placeholder="paciente@email.com" />
      </div>

      <div className="grid gap-1.5 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="create-eventType">Tipo de atendimento</Label>
          <select id="create-eventType" name="eventTypeId" className={selectClassName} defaultValue={defaultEventTypeId} required>
            {eventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.kind})
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="create-availability">Grupo de disponibilidade</Label>
          <select
            id="create-availability"
            name="availabilityId"
            className={selectClassName}
            defaultValue={defaultAvailabilityId}
            required
          >
            {availabilityGroups.map((group) => (
              <option key={group.representativeId} value={group.representativeId}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-1.5 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Data</Label>
          <input type="hidden" name="date" value={toIsoDate(selectedDate)} />
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className={cn("justify-start text-left font-normal")}>
                <CalendarIcon className="size-4" />
                <span>{formatDateLabel(selectedDate)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={ptBR}
                selected={selectedDate}
                onSelect={(value) => {
                  if (value) {
                    setSelectedDate(value);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="create-time">Horário</Label>
          <select
            id="create-time"
            name="time"
            className={selectClassName}
            value={selectedTime}
            onChange={(event) => setSelectedTime(event.target.value)}
          >
            {timeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-1.5 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="create-preferredPeriod">Período preferencial</Label>
          <select id="create-preferredPeriod" name="preferredPeriod" className={selectClassName} defaultValue="qualquer">
            <option value="manha">Manhã</option>
            <option value="tarde">Tarde</option>
            <option value="noite">Noite</option>
            <option value="qualquer">Qualquer</option>
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="create-reason">Motivo (opcional)</Label>
          <Input id="create-reason" name="reason" placeholder="Queixa principal" />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="create-notes">Observações internas</Label>
        <Textarea id="create-notes" name="notes" placeholder="Informações adicionais da equipe" />
      </div>

      <Button type="submit">Confirmar agendamento</Button>
    </form>
  );
}
