import { Skeleton } from "@/components/ui/skeleton"

export default function LeaderboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mx-auto mb-2" />
        <Skeleton className="h-6 w-96 mx-auto" />
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg border">
          <div className="p-4 border-b">
            <Skeleton className="h-6 w-32" />
          </div>

          <div className="divide-y">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <div className="ml-auto flex gap-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
