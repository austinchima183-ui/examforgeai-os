'use client'

// ============================================================================
// ExamForge AI — Global Error Boundary
// ============================================================================
// Catches errors OUTSIDE the app directory (root layout errors,
// template errors, etc.). Uses minimal UI with no dependencies
// that might themselves fail. Reports to Sentry.
// ============================================================================

import { useEffect } from 'react'
import { captureException } from '@/lib/observability/sentry'

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report to Sentry with global boundary tag
    captureException(error, {
      tags: {
        component: 'GlobalErrorBoundary',
        boundary: 'global',
      },
    })

    // Log to console (logger uses async_hooks which is server-only)
    console.error('[ExamForge AI] Global error boundary:', {
      message: error.message,
      digest: error.digest,
    })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: '#fafafa',
            textAlign: 'center',
          }}
          role="alert"
          aria-live="assertive"
        >
          {/* Error icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
            aria-hidden="true"
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#111827',
              marginBottom: 8,
            }}
          >
            Something went wrong
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: 14,
              color: '#6b7280',
              maxWidth: 400,
              lineHeight: 1.5,
              marginBottom: 8,
            }}
          >
            An unexpected error occurred. We&apos;ve been notified and are
            working on fixing the issue.
          </p>

          {/* Error digest */}
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: '#9ca3af',
                marginBottom: 24,
              }}
            >
              Error ID: {error.digest}
            </p>
          )}

          {/* Retry button — minimal inline styles, no external deps */}
          <button
            type="button"
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#ffffff',
              backgroundColor: '#4f46e5',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              marginBottom: 12,
            }}
            aria-label="Try again"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
            Try again
          </button>

          {/* Home link */}
          <a
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
            aria-label="Go to dashboard"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dashboard
          </a>

          {/* Branding */}
          <p
            style={{
              marginTop: 32,
              fontSize: 12,
              color: '#9ca3af',
            }}
          >
            ExamForge AI
          </p>
        </div>
      </body>
    </html>
  )
}
