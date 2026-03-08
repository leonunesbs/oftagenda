"use client";

import { useLayoutEffect } from "react";

export function AdminDashboardMode() {
  useLayoutEffect(() => {
    document.documentElement.classList.add("admin-dashboard-mode");
    document.body.classList.add("admin-dashboard-mode");

    return () => {
      document.documentElement.classList.remove("admin-dashboard-mode");
      document.body.classList.remove("admin-dashboard-mode");
    };
  }, []);

  return null;
}
