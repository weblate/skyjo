import { Skeleton } from "@/components/ui/skeleton"

export default function LeaderboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-10 w-64 mx-auto mb-2 bg-gray-300 dark:bg-gray-500" />
        <Skeleton className="h-6 w-96 mx-auto bg-gray-300 dark:bg-gray-500" />
      </div>

      <div className="max-w-4xl mx-auto bg-container dark:bg-dark-container">
        <div className="rounded-lg border-2 border-black dark:border-dark-border">
          <div className="p-4 border-b-2 border-black dark:border-dark-border">
            <Skeleton className="h-6 w-32 bg-gray-300 dark:bg-gray-500" />
          </div>

          <div className="divide-y divide-black dark:divide-dark-border">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`leaderboard-loading-${i}`}
                className="p-4 flex items-center gap-4"
              >
                <Skeleton className="h-8 w-8 rounded bg-gray-300 dark:bg-gray-500" />
                <Skeleton className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-500" />
                <Skeleton className="h-6 w-32 bg-gray-300 dark:bg-gray-500" />
                <div className="ml-auto flex gap-4">
                  <Skeleton className="h-6 w-16 bg-gray-300 dark:bg-gray-500" />
                  <Skeleton className="h-6 w-16 bg-gray-300 dark:bg-gray-500" />
                  <Skeleton className="h-6 w-16 bg-gray-300 dark:bg-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
