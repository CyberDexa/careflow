import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-6 w-32" />
            {Array.from({ length: 4 }).map((_, row) => (
              <Skeleton key={row} className="h-28 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
