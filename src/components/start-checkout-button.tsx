"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

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
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location, date, time }),
        });
        const data = await response.json();
        if (!response.ok || !data?.ok || typeof data.url !== "string") {
          throw new Error(data?.error ?? "Não foi possível iniciar o checkout.");
        }
        window.location.href = data.url;
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
    <div className="flex flex-col items-end gap-2">
      <Button type="button" onClick={handleStartCheckout} disabled={isLoading}>
        {isLoading ? "Redirecionando..." : label}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

