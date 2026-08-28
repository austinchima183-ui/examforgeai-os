import { Skeleton } from '@/components/ui/skeleton'

// ============================================================================
// ExamForge AI OS — Dashboard Loading Page
// ============================================================================
// Skeleton layout matching the dashboard page structure so the user
// sees the shape of the content before it loads. No blank screens.
// ============================================================================

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-in">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Stats cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/30 p-4 forge-glass-surface">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-5 w-16 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content area — two column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Chart area */}
        <div className="lg:col-span-2 rounded-xl border border-border/30 p-4 forge-glass-surface">
          <Skeleton className="h-5 w-32 rounded mb-4" />
          <Skeleton className="h-48 w-full rounded-lg" />
          <div className="flex gap-4 mt-3">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>

        {/* Sidebar / recent activity */}
        <div className="rounded-xl border border-border/30 p-4 forge-glass-surface">
          <Skeleton className="h-5 w-28 rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex flex-col gap-1 flex-1">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-2 w-2/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
