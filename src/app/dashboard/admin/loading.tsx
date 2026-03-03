import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton key={`admin-metric-skeleton-${index}`} className="h-10 rounded-md" />
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`admin-card-skeleton-${index}`} className="rounded-lg border border-border p-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full max-w-xs" />
                <Skeleton className="h-4 w-full max-w-[80%]" />
                <Skeleton className="h-9 w-36 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
