import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatusLoading() {
  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-72" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={`status-overview-skeleton-${index}`} className="h-5 rounded-md" />
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`status-env-skeleton-${index}`} className="rounded-lg border border-border/70 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`status-check-skeleton-${index}`} className="rounded-lg border border-border/70 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-5 w-52" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
