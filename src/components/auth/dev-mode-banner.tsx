'use client'

// ============================================================================
// ExamForge AI — Development Mode Banner
// ============================================================================
// Shown when Supabase is not configured (dev adapter mode).
// Clearly communicates that auth forms render but operations won't persist.
// ============================================================================

import { AlertTriangle } from 'lucide-react'

export function DevModeBanner() {
  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/50"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Development Mode
          </p>
          <p className="mt-0.5 text-amber-700 dark:text-amber-400">
            Connect Supabase for live authentication. Forms render but auth operations are inactive.
          </p>
        </div>
      </div>
    </div>
  )
}
