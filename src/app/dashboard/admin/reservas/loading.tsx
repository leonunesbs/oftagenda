import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function ReservationsStatsMobile() {
  return (
    <div className="grid grid-cols-2 gap-3 xl:hidden">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={`reservas-stat-mobile-${index}`} variant="flat-mobile" className="border-border/70">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="size-4 rounded-full" />
            </div>
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReservationsStatsDesktop() {
  return (
    <div className="hidden gap-3 xl:grid xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={`reservas-stat-desktop-${index}`} variant="flat-mobile" className="border-border/70">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="size-4 rounded-full" />
            </div>
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function AdminReservationsLoading() {
  return (
    <section className="w-full space-y-4">
      <ReservationsStatsMobile />
      <ReservationsStatsDesktop />

      <Card variant="flat-mobile" className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-14" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={`reservas-status-chip-${index}`} className="h-8 w-24 rounded-md" />
              ))}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Skeleton className="h-4 w-12" />
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>
            <div className="self-end">
              <Skeleton className="h-9 w-48" />
            </div>
          </div>

          <div className="rounded-md border">
            <div className="space-y-2 p-3">
              <div className="hidden gap-2 md:grid md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={`reservas-head-${index}`} className="h-4 w-24" />
                ))}
              </div>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={`reservas-row-${index}`} className="grid gap-2 border-t pt-2 md:grid-cols-5 md:items-center">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 rounded-md md:justify-self-end" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-4 w-44" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="hidden h-8 w-24 md:block" />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
