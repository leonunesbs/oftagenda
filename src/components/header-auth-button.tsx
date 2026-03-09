"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

type HeaderAuthButtonProps = {
  clerkEnabled: boolean;
};

type SessionState = {
  isAuthenticated: boolean;
  avatarUrl: string | null;
  firstName: string | null;
};

export function HeaderAuthButton({ clerkEnabled }: HeaderAuthButtonProps) {
  const pathname = usePathname();
  const [{ isAuthenticated, avatarUrl, firstName }, setSessionState] = useState<SessionState>({
    isAuthenticated: false,
    avatarUrl: null,
    firstName: null,
  });

  useEffect(() => {
    if (!clerkEnabled) {
      setSessionState({
        isAuthenticated: false,
        avatarUrl: null,
        firstName: null,
      });
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
          avatarUrl?: string | null;
          firstName?: string | null;
        };
        setSessionState({
          isAuthenticated: Boolean(data.isAuthenticated),
          avatarUrl: data.avatarUrl ?? null,
          firstName: data.firstName ?? null,
        });
      } catch {
        setSessionState({
          isAuthenticated: false,
          avatarUrl: null,
          firstName: null,
        });
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

  if (!isAuthenticated) {
    return (
      <Button asChild>
        <Link href="/sign-in">Entrar</Link>
      </Button>
    );
  }

  return (
    <Button variant="outline" asChild>
      <Link href="/dashboard" className="inline-flex items-center gap-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={firstName ? `Avatar de ${firstName}` : "Avatar"}
            width={20}
            height={20}
            className="size-5 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            aria-hidden
            className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold"
          >
            {(firstName?.trim().charAt(0) || "U").toUpperCase()}
          </span>
        )}
        <span>Painel</span>
      </Link>
    </Button>
  );
}
