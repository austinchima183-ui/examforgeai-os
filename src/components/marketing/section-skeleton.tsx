// ============================================================================
// ExamForge AI — Section Skeleton (Premium)
// ============================================================================
// Lightweight placeholder shown while a dynamically-imported section is
// loading. Uses the forge-shimmer keyframe for a branded shimmer effect
// matching the AI OS design system. This is a Server Component — no
// 'use client' directive needed.
// ============================================================================

export function SectionSkeleton() {
  return (
    <div className="py-20 sm:py-24 lg:py-32 forge-ambient-bg" aria-hidden="true">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="h-8 w-64 rounded-lg mx-auto bg-gradient-to-r from-transparent via-primary/8 to-transparent animate-shimmer forge-card-shadow"
               style={{ backgroundSize: '200% 100%' }} />
          <div className="h-4 w-96 rounded-lg mx-auto bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer"
               style={{ backgroundSize: '200% 100%' }} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl forge-glass-surface border border-white/10 animate-shimmer"
                   style={{ backgroundSize: '200% 100%', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
