export type AppointmentConfirmedNotificationInput = {
  appointmentId: string;
  patientName: string;
  patientPhone: string;
  location: string;
  scheduledFor: number;
  timezone: string;
  consultationType: string;
};

export type NotificationDeliveryResult = {
  ok: boolean;
  status: number;
  chatId?: string;
  error?: string;
  responseBody?: unknown;
};
