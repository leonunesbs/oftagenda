import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { CSSProperties } from "react"

type DashboardShellProps = {
  title: string
  subtitle: string
}

export function DashboardShell({ title, subtitle }: DashboardShellProps) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "19rem",
        } as CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-b px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Painel</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <div className="rounded-2xl border bg-card p-4 text-card-foreground">
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <div className="grid auto-rows-min gap-6 md:grid-cols-3">
            <div className="aspect-video rounded-2xl bg-muted/50" />
            <div className="aspect-video rounded-2xl bg-muted/50" />
            <div className="aspect-video rounded-2xl bg-muted/50" />
          </div>
          <div className="min-h-[55vh] flex-1 rounded-2xl bg-muted/50 md:min-h-[60vh]" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
