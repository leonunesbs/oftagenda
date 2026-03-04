"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";

export function AnalyticsPageview() {
  const pathname = usePathname();

  useEffect(() => {
    trackEvent("view_content", { path: pathname });
  }, [pathname]);

  return null;
}

