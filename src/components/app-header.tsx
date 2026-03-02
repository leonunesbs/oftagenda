import Link from "next/link";

import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { Button } from "@/components/ui/button";
import { isAdminFromClerkAuth } from "@/lib/access";

type AppHeaderProps = {
  clerkEnabled: boolean;
};

export async function AppHeader({ clerkEnabled }: AppHeaderProps) {
  const authData = clerkEnabled ? await auth() : null;
  const userId = authData?.userId ?? null;
  const isAdmin = authData ? isAdminFromClerkAuth(authData) : false;

  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Minha Agenda
        </Link>
        <nav className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/dashboard">Painel</Link>
          </Button>
          {isAdmin ? (
            <Button variant="ghost" asChild>
              <Link href="/dashboard/admin">Admin</Link>
            </Button>
          ) : null}
          <Button variant="ghost" asChild>
            <Link href="/agendar">Agendar</Link>
          </Button>
          {clerkEnabled ? (
            userId ? (
              <UserButton />
            ) : (
              <Button asChild>
                <Link href="/sign-in">Entrar</Link>
              </Button>
            )
          ) : (
            <Button variant="outline" disabled>
              Clerk não configurado
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
