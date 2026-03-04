import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmbedAgendarLoading() {
  return (
    <section className="mx-auto w-full max-w-3xl px-0 py-2">
      <Card className="border-border/70">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-10 w-44 rounded-md" />
        </CardContent>
      </Card>
    </section>
  );
}
