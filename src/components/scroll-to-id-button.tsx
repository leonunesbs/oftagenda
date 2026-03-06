"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

type ScrollToIdButtonProps = {
  targetId: string;
  children: React.ReactNode;
  className?: string;
};

export function ScrollToIdButton({ targetId, children, className }: ScrollToIdButtonProps) {
  const targetHash = `#${targetId}`;

  function handleClick() {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });

      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, "", targetHash);
      }
      return;
    }

    window.location.hash = targetHash;
  }

  return (
    <Button type="button" onClick={handleClick} className={className} aria-controls={targetId}>
      {children}
    </Button>
  );
}
