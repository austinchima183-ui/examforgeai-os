'use client'

// ============================================================================
// ExamForge AI OS — Root Error Boundary Page
// ============================================================================
// Catches errors in the root layout. Full-bleed dark page with
// forge glass card, branded glow, error ID display, and clear CTAs.
// Uses console.error instead of the enterprise logger (which requires
// async_hooks, a server-only Node.js module) and reports to Sentry.
// ============================================================================

import { useEffect } from 'react'
import { AlertTriangle, RotateCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { captureException } from '@/lib/observability/sentry'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to Sentry
    captureException(error, {
      tags: {
        component: 'RootErrorBoundary',
        boundary: 'root',
      },
    })

    // Log to console (logger uses async_hooks which is server-only)
    console.error('[ExamForge AI] Unhandled client error:', {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 animate-fade-in"
      style={{ backgroundColor: '#090909' }}
      role="alert"
      aria-live="assertive"
    >
      <Card className="w-full max-w-md forge-glass-surface border border-border/30 rounded-2xl forge-card-shadow bg-white/[0.03]">
        <CardHeader className="text-center pb-2">
          <div
            className="relative mx-auto"
            aria-hidden="true"
          >
            {/* Red glow behind icon */}
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-destructive/10 blur-xl scale-[2]" />
            <div className={cn(
              'relative flex h-14 w-14 items-center justify-center rounded-2xl',
              'bg-destructive/15 ring-1 ring-destructive/20',
            )}>
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <CardTitle className="mt-4 text-xl text-white">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-white/50">
            An unexpected error occurred. We&apos;ve been notified and are working on
            fixing the issue. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-white/25">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={reset}
              aria-label="Try again"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button
              variant="outline"
              asChild
              aria-label="Go to dashboard"
              className={cn(
                'gap-2 border-white/10 text-white/70',
                'hover:bg-white/5 hover:text-white',
              )}
            >
              <Link href="/dashboard">
                <Home className="h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
