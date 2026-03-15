import { getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";

function getEventTypeLabel(
  eventType: "created" | "confirmed" | "rescheduled" | "no_show" | "cancelled" | "completed" | "details_submitted",
) {
  switch (eventType) {
    case "created":
      return "Cadastro";
    case "confirmed":
      return "Confirmação";
    case "rescheduled":
      return "Reagendamento";
    case "no_show":
      return "Não compareceu";
    case "cancelled":
      return "Cancelamento";
    case "completed":
      return "Concluído";
    case "details_submitted":
      return "Detalhes enviados";
    default:
      return "Atualização";
  }
}

export async function getReservationActionData(reservationId: string) {
  const data = await getAdminSnapshot();
  const usersByClerkId = new Map(data.users.map((user) => [user.clerkUserId, user]));
  const eventTypeById = new Map(data.eventTypes.map((eventType) => [String(eventType._id), eventType]));
  const reservation = data.reservations.find((item) => String(item._id) === reservationId);

  if (!reservation) {
    return null;
  }

  const user = usersByClerkId.get(reservation.clerkUserId);
  const eventType = eventTypeById.get(String(reservation.eventTypeId));
  const recentTimeline =
    typeof reservation.appointmentId === "string"
      ? data.appointmentEvents
          .filter((event) => String(event.appointmentId) === reservation.appointmentId)
          .slice(0, 8)
          .map((event) => ({
            id: String(event._id),
            eventType: event.eventType,
            label: getEventTypeLabel(event.eventType),
            notes: event.notes ?? "",
            createdAt: event.createdAt,
          }))
      : [];

  return {
    _id: String(reservation._id),
    clerkUserId: reservation.clerkUserId,
    appointmentId: reservation.appointmentId ? String(reservation.appointmentId) : null,
    eventTypeId: String(reservation.eventTypeId),
    availabilityId: String(reservation.availabilityId),
    eventTypeTitle: reservation.eventTypeTitle,
    eventKind: eventType?.kind ?? "consulta",
    location: eventType?.location ?? "fortaleza",
    availabilityLabel: reservation.availabilityLabel,
    status: reservation.status,
    startsAt: reservation.startsAt,
    updatedAt: reservation.updatedAt,
    notes: reservation.notes,
    patientName: user?.name,
    patientEmail: user?.email,
    patientPhone: user?.phone,
    patientBirthDate: user?.birthDate,
    recentTimeline,
  };
}
