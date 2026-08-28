import { Skeleton } from '@/components/ui/skeleton'

// ============================================================================
// ExamForge AI — CBT Page Loading Skeleton (Premium)
// ============================================================================

export default function CBTLoading() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-lg mt-2" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/30 p-6 space-y-3 forge-glass-surface forge-card-shadow">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-20 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Data Table Card */}
      <div className="rounded-xl border border-border/30 forge-glass-surface forge-card-shadow p-6 space-y-4">
        <Skeleton className="h-6 w-28 rounded" />
        <Skeleton className="h-4 w-48 rounded" />
        <div className="space-y-3">
          <Skeleton className="h-9 w-64 rounded-lg" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
