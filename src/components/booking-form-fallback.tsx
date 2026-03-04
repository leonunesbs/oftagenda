import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BookingFormFallback({ embedMode = false }: { embedMode?: boolean }) {
  return (
    <Card
      className={
        embedMode
          ? "rounded-none border-x-0 border-y-0 border-border/70 bg-card/95 shadow-none"
          : "border-border/70 bg-card/95 shadow-sm"
      }
    >
      <CardHeader className="space-y-3">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-5 md:grid-rows-[auto_auto] md:gap-5">
          <div className="space-y-3 rounded-xl border border-border/70 p-4 md:col-span-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full max-w-xl" />
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`booking-fallback-location-${index}`} className="h-14 rounded-xl" />
            ))}
          </div>
          <div className="space-y-3 rounded-xl border border-border/70 p-4 md:col-span-2 md:row-span-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-[280px] rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={`booking-fallback-date-${index}`} className="h-9 rounded-md" />
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-border/70 p-4 md:col-span-3 md:row-start-2">
            <Skeleton className="h-4 w-44" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={`booking-fallback-time-${index}`} className="h-9 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-16 rounded-xl" />
            <div className="flex justify-end">
              <Skeleton className="h-10 w-40 rounded-md" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
