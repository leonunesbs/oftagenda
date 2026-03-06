"use client";

import { useEffect } from "react";

type CheckoutReturnUrlCleanerProps = {
  enabled: boolean;
};

const CHECKOUT_QUERY_KEYS = [
  "payment",
  "session_id",
  "location",
  "date",
  "time",
] as const;

export function CheckoutReturnUrlCleaner({
  enabled,
}: CheckoutReturnUrlCleanerProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const currentUrl = new URL(window.location.href);
    let hasChanges = false;
    for (const key of CHECKOUT_QUERY_KEYS) {
      if (currentUrl.searchParams.has(key)) {
        currentUrl.searchParams.delete(key);
        hasChanges = true;
      }
    }

    if (!hasChanges) {
      return;
    }

    const nextPath = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    window.history.replaceState(window.history.state, "", nextPath);
  }, [enabled]);

  return null;
}
