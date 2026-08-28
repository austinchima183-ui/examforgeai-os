import { Skeleton } from '@/components/ui/skeleton'

// ============================================================================
// ExamForge AI — Global Loading Page
// ============================================================================
// Full-page skeleton with ExamForge logo and pulsing animation.
// Shown during initial page load or route transitions at the root level.
// ============================================================================

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center forge-ambient-bg animate-fade-in">
      {/* Logo */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 backdrop-blur-sm border border-primary/30 animate-pulse-glow">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-9 w-9 text-primary-foreground"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>

        {/* Brand name */}
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-6 w-36 rounded" />
          <Skeleton className="h-3 w-48 rounded" />
        </div>
      </div>

      {/* Loading bar */}
      <div className="mt-8 w-48">
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted/50">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary forge-glow" />
        </div>
      </div>
    </div>
  )
}
