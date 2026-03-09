"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [isSigningOut, setIsSigningOut] = useState(false);
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

  async function handleSignOut() {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
      });
    } finally {
      setSessionState({
        isAuthenticated: false,
        avatarUrl: null,
        firstName: null,
      });
      window.location.href = "/";
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="inline-flex items-center gap-2">
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
          <span>{firstName ? `Olá, ${firstName}` : "Minha conta"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{firstName ? `Conta de ${firstName}` : "Minha conta"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">Ir para o painel</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={isSigningOut}
          onSelect={(event) => {
            event.preventDefault();
            void handleSignOut();
          }}
        >
          {isSigningOut ? "Saindo..." : "Sair da plataforma"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
