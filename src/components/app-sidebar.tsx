"use client"

import * as React from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import { LayoutBottomIcon } from "@hugeicons/core-free-icons"

// Dados de navegação de exemplo.
const data = {
  navMain: [
    {
      title: "Primeiros passos",
      url: "#",
      items: [
        {
          title: "Instalação",
          url: "#",
        },
        {
          title: "Estrutura do projeto",
          url: "#",
        },
      ],
    },
    {
      title: "Construindo sua aplicação",
      url: "#",
      items: [
        {
          title: "Roteamento",
          url: "#",
        },
        {
          title: "Busca de dados",
          url: "#",
          isActive: true,
        },
        {
          title: "Renderização",
          url: "#",
        },
        {
          title: "Cache",
          url: "#",
        },
        {
          title: "Estilização",
          url: "#",
        },
        {
          title: "Otimização",
          url: "#",
        },
        {
          title: "Configuração",
          url: "#",
        },
        {
          title: "Testes",
          url: "#",
        },
        {
          title: "Autenticação",
          url: "#",
        },
        {
          title: "Deploy",
          url: "#",
        },
        {
          title: "Atualização",
          url: "#",
        },
        {
          title: "Exemplos",
          url: "#",
        },
      ],
    },
    {
      title: "Referência da API",
      url: "#",
      items: [
        {
          title: "Componentes",
          url: "#",
        },
        {
          title: "Convenções de arquivos",
          url: "#",
        },
        {
          title: "Funções",
          url: "#",
        },
        {
          title: "Opções do next.config.js",
          url: "#",
        },
        {
          title: "CLI",
          url: "#",
        },
        {
          title: "Runtime Edge",
          url: "#",
        },
      ],
    },
    {
      title: "Arquitetura",
      url: "#",
      items: [
        {
          title: "Acessibilidade",
          url: "#",
        },
        {
          title: "Atualização rápida",
          url: "#",
        },
        {
          title: "Compilador do Next.js",
          url: "#",
        },
        {
          title: "Navegadores compatíveis",
          url: "#",
        },
        {
          title: "Turbopack",
          url: "#",
        },
      ],
    },
    {
      title: "Comunidade",
      url: "#",
      items: [
        {
          title: "Guia de contribuição",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <HugeiconsIcon icon={LayoutBottomIcon} strokeWidth={2} className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-medium">Documentação</span>
                  <span className="">v1.0.0</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <a href={item.url} className="font-medium">
                    {item.title}
                  </a>
                </SidebarMenuButton>
                {item.items?.length ? (
                  <SidebarMenuSub className="ml-0 border-l-0 px-1.5">
                    {item.items.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild isActive={item.isActive}>
                          <a href={item.url}>{item.title}</a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
