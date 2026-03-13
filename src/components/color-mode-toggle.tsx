"use client";

import { ComputerIcon, MoonIcon, SunIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import { Button } from "@/components/ui/button";

const THEME_STORAGE_KEY = "oftagenda-theme";
type ThemeMode = "light" | "dark" | "system";

const CYCLE: ThemeMode[] = ["light", "dark", "system"];

function resolveEffective(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", resolveEffective(mode) === "dark");
}

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

const LABELS: Record<ThemeMode, string> = {
  light: "Tema claro",
  dark: "Tema escuro",
  system: "Tema do sistema",
};

export function ColorModeToggle() {
  const [mode, setMode] = React.useState<ThemeMode>(getStoredTheme);

  React.useEffect(() => {
    const stored = getStoredTheme();
    setMode(stored);
    applyTheme(stored);
  }, []);

  React.useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  function cycleTheme() {
    const idx = CYCLE.indexOf(mode);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    setMode(next);
    applyTheme(next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  const visible = "rotate-0 scale-100 opacity-100";
  const hidden = "rotate-90 scale-0 opacity-0";

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={cycleTheme}
      aria-label={LABELS[mode]}
      title={LABELS[mode]}
      className="relative overflow-hidden"
    >
      <span className={`absolute transition-all duration-300 ${mode === "light" ? visible : hidden}`}>
        <HugeiconsIcon icon={SunIcon} strokeWidth={2} />
      </span>
      <span className={`absolute transition-all duration-300 ${mode === "dark" ? visible : hidden}`}>
        <HugeiconsIcon icon={MoonIcon} strokeWidth={2} />
      </span>
      <span className={`absolute transition-all duration-300 ${mode === "system" ? visible : hidden}`}>
        <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} />
      </span>
    </Button>
  );
}
