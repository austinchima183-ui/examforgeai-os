'use client'

// ============================================================================
// ExamForge AI — (marketing) Route-Level Error Boundary
// ============================================================================
// Catches errors within the marketing site route group. Shows a
// user-friendly error page with retry and navigation options.
// ============================================================================

import { useEffect } from 'react'
import { AlertTriangle, RotateCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { captureException } from '@/lib/observability/sentry'
import Link from 'next/link'

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureException(error, {
      tags: {
        component: 'MarketingErrorBoundary',
        routeGroup: '(marketing)',
      },
    })
    console.error('[ExamForge AI] Marketing route error:', {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <div
      className="flex min-h-[60vh] items-center justify-center p-6"
      role="alert"
      aria-live="assertive"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
            aria-hidden="true"
          >
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-xl">Page Error</CardTitle>
          <CardDescription className="mt-1">
            Something went wrong on this page. We&apos;ve been notified and are working on a fix.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {error.digest && (
            <p className="text-xs text-foreground/55">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={reset} aria-label="Retry loading the page">
              <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button variant="outline" asChild aria-label="Go to homepage">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                Homepage
              </Link>
            </Button>
          </div>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            onClick={() => {
              const subject = encodeURIComponent(`Error Report: ${error.digest ?? 'Unknown'}`)
              window.open(`/help-center?subject=${subject}`, '_blank')
            }}
            aria-label="Report this issue to support"
          >
            <Bug className="h-3 w-3" aria-hidden="true" />
            Report issue
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
