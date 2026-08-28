'use client'

// ============================================================================
// ExamForge AI — (app) Route-Level Error Boundary
// ============================================================================
// Catches all errors within the (app) route group. Preserves the
// AppShell layout (sidebar + header) and shows the error in the
// content area. Reports to Sentry and provides retry action.
// ============================================================================

import { useEffect } from 'react'
import { AlertTriangle, RotateCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { captureException } from '@/lib/observability/sentry'
import Link from 'next/link'

// ──────────────────────────────────────────────────────────────
// Error Classification for UI
// ──────────────────────────────────────────────────────────────

type AppErrorVariant = 'generic' | 'auth' | 'network' | 'permission'

function classifyAppError(error: Error): AppErrorVariant {
  const msg = error.message.toLowerCase()

  if (
    msg.includes('unauthorized') ||
    msg.includes('unauthenticated') ||
    msg.includes('401')
  ) {
    return 'auth'
  }

  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('offline') ||
    msg.includes('failed to fetch')
  ) {
    return 'network'
  }

  if (
    msg.includes('forbidden') ||
    msg.includes('permission') ||
    msg.includes('403')
  ) {
    return 'permission'
  }

  return 'generic'
}

const VARIANT_CONFIG = {
  generic: {
    title: 'Something went wrong',
    description:
      "An error occurred while loading this page. We've been notified and are working on a fix.",
    icon: AlertTriangle,
  },
  auth: {
    title: 'Authentication error',
    description:
      'There was a problem with your session. Please sign in again.',
    icon: AlertTriangle,
  },
  network: {
    title: 'Connection problem',
    description:
      "We couldn't reach the server. Check your internet connection and try again.",
    icon: AlertTriangle,
  },
  permission: {
    title: 'Access denied',
    description:
      "You don't have permission to view this page. Contact your administrator.",
    icon: AlertTriangle,
  },
} as const

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const variant = classifyAppError(error)
  const config = VARIANT_CONFIG[variant]

  useEffect(() => {
    // Report to Sentry
    captureException(error, {
      tags: {
        component: 'AppErrorBoundary',
        variant,
        routeGroup: '(app)',
      },
    })

    // Also log to console (logger uses async_hooks which is server-only)
    console.error('[ExamForge AI] App route error:', {
      message: error.message,
      variant,
      digest: error.digest,
    })
  }, [error, variant])

  return (
    <div
      className="flex flex-1 items-center justify-center p-6"
      role="alert"
      aria-live="assertive"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10"
            aria-hidden="true"
          >
            <config.icon className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="mt-4 text-xl">{config.title}</CardTitle>
          <CardDescription className="mt-1">{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          {/* Error digest for support (never show stack traces) */}
          {error.digest && (
            <p className="text-xs text-foreground/55">
              Error ID: {error.digest}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={reset} aria-label="Retry loading the page">
              <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button variant="outline" asChild aria-label="Go to dashboard">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                Dashboard
              </Link>
            </Button>
          </div>

          {/* Support link */}
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
