import { Skeleton } from '@/components/ui/skeleton'

// ============================================================================
// ExamForge AI — Billing Page Loading Skeleton
// ============================================================================

export default function BillingLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-24 rounded" />
          <Skeleton className="h-4 w-56 rounded mt-2" />
        </div>
      </div>

      {/* Current Plan & Upgrade */}
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-5 w-28 rounded" />
                <Skeleton className="h-4 w-40 rounded mt-1" />
              </div>
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <Skeleton className="h-6 w-32 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Usage */}
      <div className="rounded-xl border p-6 space-y-6">
        <Skeleton className="h-5 w-16 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <Skeleton className="h-2 w-full rounded" />
          </div>
        ))}
      </div>

      {/* Invoice History */}
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-5 w-32 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div>
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded mt-1" />
              </div>
            </div>
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
