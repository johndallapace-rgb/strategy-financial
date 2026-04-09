import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-3 w-16 rounded-md" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="relative overflow-hidden border bg-card/70 backdrop-blur">
            <CardHeader className="space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-10 w-40 rounded-md" />
              <Skeleton className="h-3 w-44 rounded-md" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="bg-card/70 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <Skeleton className="h-4 w-10 rounded-md" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="rounded-lg border bg-card p-3">
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="mt-2 h-5 w-20 rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="bg-card/70 backdrop-blur">
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-40 rounded-md" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[260px] w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card/70 backdrop-blur lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-10 rounded-md" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-4 w-32 rounded-md" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="bg-card/70 backdrop-blur">
              <CardHeader className="space-y-2">
                <Skeleton className="h-4 w-44 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="flex items-center justify-between">
                    <Skeleton className="h-3 w-32 rounded-md" />
                    <Skeleton className="h-4 w-20 rounded-md" />
                  </div>
                ))}
                <Skeleton className="h-10 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

