import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
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
        <SidebarInset>
          <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
