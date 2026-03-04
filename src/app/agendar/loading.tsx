import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AgendarLoading() {
  return (
    <section className="mx-auto w-full max-w-5xl">
      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 rounded-md" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(20rem,22rem)_minmax(0,1fr)]">
            <Skeleton className="h-[320px] rounded-2xl" />
            <Skeleton className="h-[320px] rounded-2xl" />
          </div>

          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-40 rounded-md" />
            <Skeleton className="h-10 w-44 rounded-md" />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
