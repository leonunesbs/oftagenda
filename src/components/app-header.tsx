import Link from "next/link";
import {
  LayoutBottomIcon,
  LayoutIcon,
  MoreVerticalCircle01Icon,
  SearchIcon,
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
import { HeaderAuthButton } from "@/components/header-auth-button";
import { siteConfig } from "@/config/site";

type AppHeaderProps = {
  clerkEnabled: boolean;
};

export function AppHeader({ clerkEnabled }: AppHeaderProps) {
  const panelHref = "/dashboard";
  const navItems = [
    { href: "/", label: "Home", icon: LayoutIcon },
    { href: panelHref, label: "Painel", icon: LayoutBottomIcon },
    { href: "/agendar", label: "Agendar", icon: SearchIcon },
  ];
  const oftleonardoContentUrl = `${siteConfig.social.oftleonardoSite}/conteudos?utm_source=oftagenda&utm_medium=referral&utm_campaign=crossdomain_seo`;
  const mobileMenuContentId = "mobile-menu-sheet-content";

  return (
    <header data-app-header className="border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="rounded-md border border-border/80 bg-muted/60 p-1">
            <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} className="size-4" />
          </span>
          <span className="flex flex-col leading-tight">
            <span>Minha Agenda</span>
            <span className="text-[11px] font-normal text-muted-foreground">Leonardo Nunes</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex md:gap-3">
          {navItems.map((item) => (
            <Button key={item.href} variant="ghost" asChild>
              <Link href={item.href} prefetch={item.href === panelHref ? false : undefined}>
                {item.label}
              </Link>
            </Button>
          ))}
          <Button variant="ghost" asChild>
            <Link href={oftleonardoContentUrl} target="_blank" rel="noreferrer">
              Conteúdos
            </Link>
          </Button>
          <ColorModeToggle />
          <HeaderAuthButton clerkEnabled={clerkEnabled} />
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ColorModeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Abrir menu">
                <HugeiconsIcon icon={MoreVerticalCircle01Icon} strokeWidth={2} />
              </Button>
            </SheetTrigger>
            <SheetContent id={mobileMenuContentId} side="right" className="w-[84vw] max-w-xs">
              <SheetHeader className="pb-3">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Acesse as principais páginas.</SheetDescription>
              </SheetHeader>
              <nav className="flex flex-col gap-2 px-6 pb-6">
                {navItems.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <Button variant="ghost" asChild className="justify-start">
                      <Link
                        href={item.href}
                        prefetch={item.href === panelHref ? false : undefined}
                      >
                        <HugeiconsIcon
                          icon={item.icon}
                          strokeWidth={2}
                          data-icon="inline-start"
                        />
                        {item.label}
                      </Link>
                    </Button>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link href={oftleonardoContentUrl} target="_blank" rel="noreferrer">
                      Conteúdos
                    </Link>
                  </Button>
                </SheetClose>
                <div className="mt-2">
                  <HeaderAuthButton clerkEnabled={clerkEnabled} />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
