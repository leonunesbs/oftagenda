import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { CSSProperties, ReactNode } from "react"

type DashboardShellProps = {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen">
      <SidebarProvider
        data-admin-shell
        style={
          {
            "--sidebar-width": "19rem",
          } as CSSProperties
        }
      >
        <AppSidebar />
        <SidebarInset className="min-w-0 max-w-full overflow-x-hidden">
          <header className="sticky top-0 z-20 flex h-14 items-center border-b bg-background/95 px-4 backdrop-blur md:hidden">
            <SidebarTrigger aria-label="Abrir menu lateral" />
            <span className="ml-2 text-sm font-medium text-muted-foreground">Painel administrativo</span>
          </header>
          <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
