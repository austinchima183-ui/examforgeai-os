// ============================================================================
// ExamForge AI — Marketing Loading State
// ============================================================================
// Shown while marketing pages are loading. Provides a full-page skeleton
// that matches the marketing layout structure (nav + content + footer).
// ============================================================================

export default function MarketingLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav skeleton */}
      <header className="h-16 border-b border-border/40" aria-hidden="true">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="animate-pulse h-8 w-32 bg-muted/30 rounded-lg" />
          <div className="animate-pulse h-8 w-64 bg-muted/20 rounded-lg hidden sm:block" />
          <div className="animate-pulse h-9 w-24 bg-muted/20 rounded-lg" />
        </div>
      </header>

      {/* Main content skeleton */}
      <main className="flex-1">
        <div className="py-20 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-8 text-center">
              <div className="h-7 w-32 bg-muted/20 rounded-full mx-auto" />
              <div className="h-12 w-96 bg-muted/30 rounded-lg mx-auto" />
              <div className="h-6 w-[480px] bg-muted/20 rounded-lg mx-auto" />
              <div className="flex items-center justify-center gap-4 mt-8">
                <div className="h-12 w-36 bg-muted/20 rounded-lg" />
                <div className="h-12 w-36 bg-muted/20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Card grid skeleton */}
        <div className="py-16 sm:py-20 bg-muted/20 border-y border-border/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-8">
              <div className="h-8 w-64 bg-muted/30 rounded-lg mx-auto" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-muted/20 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer skeleton */}
      <footer className="h-24 border-t border-border/40" aria-hidden="true">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="animate-pulse h-4 w-48 bg-muted/20 rounded-lg" />
          <div className="animate-pulse h-4 w-32 bg-muted/20 rounded-lg" />
        </div>
      </footer>
    </div>
  )
}
