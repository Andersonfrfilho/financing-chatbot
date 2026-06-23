export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-gray-200 ${className ?? ''}`} />
}

export function TableSkeleton({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="bg-gray-50 border-b px-4 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-20 flex-shrink-0" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 flex items-center gap-6">
            <Skeleton className="h-3 w-28 flex-shrink-0" />
            <Skeleton className="h-3 w-32 flex-shrink-0" />
            {cols > 2 && <Skeleton className="h-3 w-20 hidden sm:block flex-shrink-0" />}
            {cols > 3 && <Skeleton className="h-5 w-16 rounded-full flex-shrink-0" />}
            <Skeleton className="h-3 w-14 ml-auto flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
