import Link from "next/link";

import { ClerkLoaded, ClerkLoading, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import {
  File01Icon,
  LayoutBottomIcon,
  LayoutIcon,
  MoreVerticalCircle01Icon,
  SearchIcon,
  ShieldIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { ColorModeToggle } from "@/components/color-mode-toggle";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getUserRoleFromClerkAuth, isAdminFromClerkAuth } from "@/lib/access";
import { siteConfig } from "@/config/site";

type AppHeaderProps = {
  clerkEnabled: boolean;
};

function ClerkUserButtonWithLoading() {
  return (
    <>
      <ClerkLoading>
        <span
          aria-hidden="true"
          className="size-8 animate-pulse rounded-full border border-border/70 bg-muted"
        />
      </ClerkLoading>
      <ClerkLoaded>
        <UserButton />
      </ClerkLoaded>
    </>
  );
}

export async function AppHeader({ clerkEnabled }: AppHeaderProps) {
  const authData = clerkEnabled ? await auth() : null;
  const userId = authData?.userId ?? null;
  const isAdmin = authData ? await isAdminFromClerkAuth(authData) : false;
  const role = authData ? await getUserRoleFromClerkAuth(authData) : null;
  const navItems = [
    { href: "/", label: "Home", icon: LayoutIcon },
    { href: "/dashboard", label: "Painel", icon: LayoutBottomIcon },
    ...(isAdmin ? [{ href: "/dashboard/admin", label: "Admin", icon: ShieldIcon }] : []),
    { href: "/agendar", label: "Agendar", icon: SearchIcon },
    { href: "/status", label: "Status", icon: File01Icon },
  ];
  const oftleonardoContentUrl = `${siteConfig.social.oftleonardoSite}/conteudos?utm_source=oftagenda&utm_medium=referral&utm_campaign=crossdomain_seo`;

  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="rounded-md border border-border/80 bg-muted/60 p-1">
            <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} className="size-4" />
          </span>
          Minha Agenda
        </Link>

        <nav className="hidden items-center gap-2 md:flex md:gap-3">
          {navItems.map((item) => (
            <Button key={item.href} variant="ghost" asChild>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          <Button variant="ghost" asChild>
            <a href={oftleonardoContentUrl} target="_blank" rel="noreferrer">
              Conteudos
            </a>
          </Button>
          <ColorModeToggle />
          {role ? <span className="hidden text-xs text-muted-foreground md:inline">Role: {role}</span> : null}
          {clerkEnabled ? (
            userId ? (
              <ClerkUserButtonWithLoading />
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

        <div className="flex items-center gap-2 md:hidden">
          <ColorModeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Abrir menu">
                <HugeiconsIcon icon={MoreVerticalCircle01Icon} strokeWidth={2} />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[84vw] max-w-xs">
              <SheetHeader className="pb-3">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Acesse as principais paginas.</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-2 px-6 pb-6">
                {navItems.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link href={item.href}>
                        <HugeiconsIcon icon={item.icon} strokeWidth={2} data-icon="inline-start" />
                        {item.label}
                      </Link>
                    </Button>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Button variant="ghost" asChild className="justify-start">
                    <a href={oftleonardoContentUrl} target="_blank" rel="noreferrer">
                      Conteudos
                    </a>
                  </Button>
                </SheetClose>

                {role ? <span className="px-2 pt-2 text-xs text-muted-foreground">Role: {role}</span> : null}

                {clerkEnabled ? (
                  userId ? null : (
                    <SheetClose asChild>
                      <Button asChild className="mt-2">
                        <Link href="/sign-in">Entrar</Link>
                      </Button>
                    </SheetClose>
                  )
                ) : (
                  <Button variant="outline" disabled className="mt-2">
                    Clerk nao configurado
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          {clerkEnabled && userId ? <ClerkUserButtonWithLoading /> : null}
        </div>
      </div>
    </header>
  );
}
