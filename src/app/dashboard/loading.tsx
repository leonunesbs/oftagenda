import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 max-md:-mx-4 max-md:max-w-none max-md:px-4">
      <Card variant="flat-mobile" className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3 rounded-xl border border-border p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-9 w-44 rounded-md" />
          </div>

          <div className="space-y-4 rounded-xl border border-border p-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-9 w-72 rounded-md" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-5 w-52" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
