import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DetalhesLoading() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 rounded-md" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 rounded-md" />
          </div>
          <div className="grid gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-28 rounded-md" />
          </div>
          <Skeleton className="h-10 w-44 rounded-md" />
        </CardContent>
      </Card>
    </section>
  );
}
