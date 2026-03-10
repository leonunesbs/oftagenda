"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import Link from "next/link";

type StartCheckoutButtonProps = {
  location: string;
  date: string;
  time: string;
  label?: string;
  isAuthenticated?: boolean;
};

type CheckoutErrorState = {
  title: string;
  description?: string;
  redirectTo?: string;
};

type CheckoutApiResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
  errorDetails?: string;
  errorCode?: string;
  redirectTo?: string;
};

export function StartCheckoutButton({
  location,
  date,
  time,
  label = "Ir para pagamento",
  isAuthenticated,
}: StartCheckoutButtonProps) {
  const [isLoading, startCheckoutTransition] = useTransition();
  const [error, setError] = useState<CheckoutErrorState | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  async function handleStartCheckout() {
    if (isLoading) {
      return;
    }

    if (isAuthenticated === false) {
      redirectToSignIn();
      return;
    }

    setError(null);
    startCheckoutTransition(async () => {
      try {
        trackEvent("submit_booking", {
          location,
          date,
          time,
          step: "checkout",
        });
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location, date, time }),
        });
        const data = (await response
          .json()
          .catch(() => null)) as CheckoutApiResponse | null;
        if (requiresAuthentication(response, data)) {
          redirectToSignIn();
          return;
        }
        if (!response.ok || !data?.ok || typeof data.url !== "string") {
          const normalizedError = normalizeCheckoutError(data);
          setError(normalizedError);
          if (normalizedError.redirectTo) {
            if (redirectTimerRef.current) {
              clearTimeout(redirectTimerRef.current);
            }
            redirectTimerRef.current = setTimeout(() => {
              const target = window.self !== window.top ? window.top! : window;
              target.location.href = normalizedError.redirectTo!;
            }, 1200);
          }
          return;
        }
        const target = window.self !== window.top ? window.top! : window;
        target.location.href = data.url;
      } catch (checkoutError) {
        setError(
          checkoutError instanceof Error
            ? {
                title: checkoutError.message,
              }
            : {
                title: "Falha ao redirecionar para o pagamento.",
              },
        );
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <Button
        type="button"
        onClick={handleStartCheckout}
        disabled={isLoading}
        className="w-full sm:w-auto"
      >
        {isLoading ? "Redirecionando..." : label}
      </Button>
      <p className="w-full rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 text-center text-xs text-muted-foreground sm:w-auto sm:text-left">
        Link de pagamento e bloqueio do horário válidos por 30 minutos.
      </p>
      {error ? (
        <div className="w-full rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive sm:max-w-[24rem]">
          <p className="font-medium">{error.title}</p>
          {error.description ? (
            <p className="mt-1 text-xs text-destructive/90">
              {error.description}
            </p>
          ) : null}
          {error.redirectTo ? (
            <div className="mt-2 flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={error.redirectTo}>Ir para meu agendamento</Link>
              </Button>
              <span className="text-xs text-destructive/80">
                Redirecionando automaticamente...
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  function redirectToSignIn() {
    const returnBackUrl = getReturnBackUrl();
    const target = window.self !== window.top ? window.top! : window;
    target.location.href = `/sign-in?redirect_url=${encodeURIComponent(returnBackUrl)}`;
  }

  function getReturnBackUrl() {
    const topWindow = window.self !== window.top ? window.top! : window;
    try {
      return topWindow.location.href;
    } catch {
      // Cross-origin iframe: fallback to current frame URL.
      return window.location.href;
    }
  }
}

function requiresAuthentication(
  response: Response,
  data: CheckoutApiResponse | null,
): boolean {
  if (response.status === 401 || response.status === 403) {
    return true;
  }

  if (response.redirected && isSignInUrl(response.url)) {
    return true;
  }

  const rawError = typeof data?.error === "string" ? data.error : "";
  const normalizedError = rawError.trim().toLowerCase();
  return (
    normalizedError === "not authenticated" ||
    normalizedError === "not authorized" ||
    normalizedError.includes("not authenticated") ||
    normalizedError.includes("not authorized") ||
    normalizedError.includes("não autenticado") ||
    normalizedError.includes("nao autenticado")
  );
}

function isSignInUrl(url: string): boolean {
  if (url.trim().length === 0) {
    return false;
  }

  try {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.pathname === "/sign-in";
  } catch {
    return false;
  }
}

function normalizeCheckoutError(
  data: CheckoutApiResponse | null,
): CheckoutErrorState {
  if (data?.errorCode === "ACTIVE_APPOINTMENT_EXISTS" && data.redirectTo) {
    return {
      title: data.error || "Você já possui um agendamento ativo.",
      description:
        data.errorDetails ||
        "Você será redirecionado para o painel para gerenciar seu agendamento.",
      redirectTo: data.redirectTo,
    };
  }
  if (data?.errorCode === "PENDING_RESERVATION_EXISTS" && data.redirectTo) {
    return {
      title: data.error || "Você já possui um agendamento pendente.",
      description:
        data.errorDetails ||
        "Gerencie primeiro o agendamento pendente no painel.",
      redirectTo: data.redirectTo,
    };
  }
  if (typeof data?.error === "string" && data.error.trim().length > 0) {
    return {
      title: data.error,
      description: data.errorDetails,
      redirectTo:
        typeof data.redirectTo === "string" ? data.redirectTo : undefined,
    };
  }
  return {
    title: "Não foi possível iniciar o checkout.",
  };
}
