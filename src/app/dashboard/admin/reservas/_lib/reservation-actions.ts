import { getAdminSnapshot } from "@/app/dashboard/admin/_lib/admin-dashboard";

export async function getReservationActionData(reservationId: string) {
  const data = await getAdminSnapshot();
  const usersByClerkId = new Map(data.users.map((user) => [user.clerkUserId, user]));
  const reservation = data.reservations.find((item) => String(item._id) === reservationId);

  if (!reservation) {
    return null;
  }

  const user = usersByClerkId.get(reservation.clerkUserId);

  return {
    _id: String(reservation._id),
    clerkUserId: reservation.clerkUserId,
    eventTypeId: String(reservation.eventTypeId),
    availabilityId: String(reservation.availabilityId),
    eventTypeTitle: reservation.eventTypeTitle,
    availabilityLabel: reservation.availabilityLabel,
    status: reservation.status,
    startsAt: reservation.startsAt,
    notes: reservation.notes,
    patientName: user?.name,
    patientEmail: user?.email,
    patientPhone: user?.phone,
  };
}
