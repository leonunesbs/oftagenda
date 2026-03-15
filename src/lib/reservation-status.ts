export const reservationStatuses = [
  "pending",
  "awaiting_patient",
  "confirmed",
  "in_care",
  "surgery_planned",
  "postop_followup",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type ReservationStatus = (typeof reservationStatuses)[number];

export const reservationStatusFilterOptions = ["all", ...reservationStatuses] as const;

export type ReservationStatusFilter = (typeof reservationStatusFilterOptions)[number];

export const reservationStatusLabel: Record<ReservationStatus, string> = {
  pending: "Pendente",
  awaiting_patient: "Aguardando paciente",
  confirmed: "Confirmado",
  in_care: "Em atendimento",
  surgery_planned: "Cirurgia planejada",
  postop_followup: "Pós-operatório",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

export const reservationStatusBadgeVariant: Record<
  ReservationStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  awaiting_patient: "secondary",
  confirmed: "default",
  in_care: "default",
  surgery_planned: "outline",
  postop_followup: "outline",
  completed: "outline",
  cancelled: "destructive",
  no_show: "destructive",
};

export function isReservationStatus(value: string): value is ReservationStatus {
  return (reservationStatuses as readonly string[]).includes(value);
}
