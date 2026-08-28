import { Skeleton } from '@/components/ui/skeleton'

// ============================================================================
// ExamForge AI — App Shell Loading
// ============================================================================
// Loading skeleton that matches the final AppShell layout (sidebar + content).
// Provides a smooth visual transition without layout shift.
// ============================================================================

export default function AppShellLoading() {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Skeleton (desktop only) */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-sidebar p-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 h-16 px-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-28 rounded" />
        </div>

        {/* Nav items */}
        <div className="flex flex-col gap-2 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>

        <div className="mt-4">
          <Skeleton className="h-4 w-16 rounded mb-2" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg mt-2" />
          ))}
        </div>

        {/* Collapse button */}
        <div className="mt-auto">
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header Skeleton */}
        <header className="flex h-16 items-center gap-4 border-b px-6">
          <Skeleton className="h-4 w-32 rounded" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </header>

        {/* Content Skeleton */}
        <main className="flex-1 p-6">
          <div className="container max-w-7xl mx-auto space-y-6">
            {/* Page title */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 rounded" />
              <Skeleton className="h-4 w-72 rounded" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-9 w-9 rounded-lg" />
                  </div>
                  <Skeleton className="h-8 w-28 rounded" />
                  <Skeleton className="h-3 w-36 rounded" />
                </div>
              ))}
            </div>

            {/* Chart area */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl border p-6 space-y-4">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-64 w-full rounded" />
              </div>
              <div className="rounded-xl border p-6 space-y-4">
                <Skeleton className="h-5 w-32 rounded" />
                <Skeleton className="h-64 w-full rounded" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
