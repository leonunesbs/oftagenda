import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <section className="w-full space-y-6">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={`admin-filter-skeleton-${index}`} className="h-8 w-24 rounded-md" />
        ))}
      </div>

      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`admin-kpi-skeleton-${index}`} className="rounded-xl border p-4">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="mt-3 h-8 w-24" />
                <Skeleton className="mt-2 h-3 w-40" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="space-y-2 p-3">
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={`admin-row-skeleton-${index}`} className="h-11 w-full rounded-md" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-full max-w-md" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={`admin-quick-action-skeleton-${index}`} className="h-16 rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
