"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

type StartCheckoutButtonProps = {
  location: string;
  date: string;
  time: string;
  label?: string;
};

export function StartCheckoutButton({
  location,
  date,
  time,
  label = "Ir para pagamento",
}: StartCheckoutButtonProps) {
  const [isLoading, startCheckoutTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleStartCheckout() {
    if (isLoading) {
      return;
    }
    setError(null);
    startCheckoutTransition(async () => {
      try {
        trackEvent("submit_booking", { location, date, time, step: "checkout" });
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location, date, time }),
        });
        const data = await response.json();
        if (!response.ok || !data?.ok || typeof data.url !== "string") {
          throw new Error(data?.error ?? "Não foi possível iniciar o checkout.");
        }
        const target = window.self !== window.top ? window.top! : window;
        target.location.href = data.url;
      } catch (checkoutError) {
        setError(
          checkoutError instanceof Error
            ? checkoutError.message
            : "Falha ao redirecionar para o pagamento.",
        );
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <Button type="button" onClick={handleStartCheckout} disabled={isLoading} className="w-full sm:w-auto">
        {isLoading ? "Redirecionando..." : label}
      </Button>
      <p className="w-full rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-center text-xs text-muted-foreground sm:w-auto sm:text-left">
        Link de pagamento e bloqueio do horário válidos por 30 minutos.
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

