"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

type HeaderAuthButtonProps = {
  clerkEnabled: boolean;
};

type SessionState = {
  isLoading: boolean;
  isAuthenticated: boolean;
};

export function HeaderAuthButton({ clerkEnabled }: HeaderAuthButtonProps) {
  const pathname = usePathname();
  const [{ isLoading, isAuthenticated }, setSessionState] = useState<SessionState>({
    isLoading: clerkEnabled,
    isAuthenticated: false,
  });

  useEffect(() => {
    if (!clerkEnabled) {
      setSessionState({ isLoading: false, isAuthenticated: false });
      return;
    }

    // Keep the landing page free of auth handshakes/redirect chains that hurt FCP/LCP.
    if (pathname === "/") {
      setSessionState({ isLoading: false, isAuthenticated: false });
      return;
    }

    const controller = new AbortController();

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Falha ao consultar sessao");
        }

        const data = (await response.json()) as {
          isAuthenticated?: boolean;
        };
        setSessionState({
          isLoading: false,
          isAuthenticated: Boolean(data.isAuthenticated),
        });
      } catch {
        setSessionState({ isLoading: false, isAuthenticated: false });
      }
    }

    void checkSession();

    return () => {
      controller.abort();
    };
  }, [clerkEnabled, pathname]);

  if (!clerkEnabled) {
    return (
      <Button variant="outline" disabled>
        Clerk não configurado
      </Button>
    );
  }

  if (isLoading) {
    return (
      <Button aria-busy disabled>
        Carregando...
      </Button>
    );
  }

  return (
    <Button asChild>
      <Link href={isAuthenticated ? "/dashboard" : "/sign-in"}>
        {isAuthenticated ? "Painel" : "Entrar"}
      </Link>
    </Button>
  );
}
