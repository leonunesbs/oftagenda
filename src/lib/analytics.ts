export type AnalyticsEventName =
  | "view_content"
  | "select_city"
  | "start_booking"
  | "submit_booking"
  | "booking_confirmed"
  | "cross_domain_click";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function sanitizeValue(value: string) {
  // Avoid sending PII in analytics fields.
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[redacted-phone]");
}

function sanitizePayload(payload: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, sanitizeValue(value)];
      }
      return [key, value];
    }),
  );
}

export function trackEvent(event: AnalyticsEventName, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    return;
  }

  const safePayload = sanitizePayload(payload);
  window.dataLayer?.push({ event, ...safePayload });
  window.gtag?.("event", event, safePayload);
}

