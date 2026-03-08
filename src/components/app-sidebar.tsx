"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { File01Icon, LayoutBottomIcon, LayoutIcon, SearchIcon, ShieldIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type SidebarSection = {
  title: string;
  items: Array<{ label: string; href: string; icon: typeof LayoutBottomIcon }>;
};

const adminSections: SidebarSection[] = [
  {
    title: "Gestão",
    items: [
      { label: "Visão geral", href: "/dashboard/admin", icon: LayoutBottomIcon },
      { label: "Agenda", href: "/dashboard/admin/agenda", icon: SearchIcon },
      { label: "Eventos da agenda", href: "/dashboard/admin/agenda-eventos", icon: File01Icon },
    ],
  },
  {
    title: "Configuração",
    items: [
      { label: "Tipos de evento", href: "/dashboard/admin/eventos", icon: LayoutBottomIcon },
      { label: "Disponibilidade", href: "/dashboard/admin/disponibilidade", icon: LayoutBottomIcon },
    ],
  },
  {
    title: "Financeiro",
    items: [
      { label: "Reservas", href: "/dashboard/admin/reservas", icon: ShieldIcon },
      { label: "Pagamentos", href: "/dashboard/admin/pagamentos", icon: ShieldIcon },
    ],
  },
  {
    title: "Acesso",
    items: [{ label: "Usuários", href: "/dashboard/admin/usuarios", icon: ShieldIcon }],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild isActive={isActivePath(pathname, "/dashboard/admin")}>
              <Link href="/dashboard/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Painel administrativo</span>
                  <span className="text-[11px] text-sidebar-foreground/70">Plataforma unificada</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {adminSections.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActivePath(pathname, item.href)}>
                    <Link href={item.href}>
                      <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/dashboard">
                <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} />
                <span>Sair do admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <HugeiconsIcon icon={LayoutIcon} strokeWidth={2} />
                <span>Ir para home</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
