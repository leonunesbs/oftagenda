"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

type BookingConfirmedEventProps = {
  enabled: boolean;
};

export function BookingConfirmedEvent({ enabled }: BookingConfirmedEventProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    trackEvent("booking_confirmed", { source: "dashboard" });
  }, [enabled]);

  return null;
}

