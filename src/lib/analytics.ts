import { sendGTMEvent } from "@next/third-parties/google";

export type AnalyticsEventName =
  | "view_content"
  | "select_city"
  | "start_booking"
  | "submit_booking"
  | "booking_confirmed"
  | "cross_domain_click";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    dataLayer?: Object[];
    __oftConsent?: "granted" | "denied";
    google_tag_manager?: Record<string, unknown>;
  }
}

const CONSENT_KEY = "oftcore:consent:v1";

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

function hasGrantedConsent() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const saved = window.localStorage.getItem(CONSENT_KEY);
    if (saved === "granted" || saved === "denied") {
      return saved === "granted";
    }
  } catch {
    // Some browsers/privacy contexts can block localStorage access.
  }

  return window.__oftConsent === "granted";
}

export function trackEvent(event: AnalyticsEventName, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") {
    return;
  }
  if (!hasGrantedConsent()) {
    return;
  }

  const safePayload = sanitizePayload(payload);
  if (window.google_tag_manager) {
    sendGTMEvent({ event, ...safePayload });
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...safePayload });
  window.gtag?.("event", event, safePayload);
}

