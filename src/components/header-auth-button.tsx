"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
  initialSessionState: SessionState;
};

export type SessionState = {
  isAuthenticated: boolean;
  userId: string | null;
  avatarUrl: string | null;
  firstName: string | null;
};

export function HeaderAuthButton({ clerkEnabled, initialSessionState }: HeaderAuthButtonProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [{ isAuthenticated, userId, avatarUrl, firstName }, setSessionState] =
    useState<SessionState>(initialSessionState);

  useEffect(() => {
    if (!clerkEnabled || isSigningOut) {
      return;
    }

    let isMounted = true;

    async function syncSessionState() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as Partial<SessionState> & {
          clerkEnabled?: boolean;
        };

        if (!isMounted || payload.clerkEnabled === false) {
          return;
        }

        setSessionState({
          isAuthenticated: Boolean(payload.isAuthenticated),
          userId: typeof payload.userId === "string" ? payload.userId : null,
          avatarUrl:
            typeof payload.avatarUrl === "string" ? payload.avatarUrl : null,
          firstName:
            typeof payload.firstName === "string" ? payload.firstName : null,
        });
      } catch {
        // Keep optimistic SSR state when session probe fails.
      }
    }

    void syncSessionState();

    return () => {
      isMounted = false;
    };
  }, [clerkEnabled, isSigningOut]);

  if (!clerkEnabled) {
    return (
      <Button variant="outline" disabled>
        Clerk não configurado
      </Button>
    );
  }

  if (!isAuthenticated) {
    const qs = searchParams.toString();
    const returnPath = qs ? `${pathname}?${qs}` : (pathname || "/");
    const signInHref = `/sign-in?redirect_url=${encodeURIComponent(returnPath)}`;
    return (
      <Button asChild>
        <Link href={signInHref}>Entrar</Link>
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
        userId: null,
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
              {(firstName?.trim().charAt(0) || userId?.trim().charAt(0) || "U").toUpperCase()}
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
