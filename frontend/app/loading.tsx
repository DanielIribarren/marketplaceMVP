import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 space-y-4">
          <Skeleton className="h-10 w-52 rounded-xl" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-border/80 bg-card/90 p-5"
            >
              <Skeleton className="mb-4 h-5 w-28" />
              <Skeleton className="mb-3 h-6 w-10/12" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="mb-6 h-4 w-4/5" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
