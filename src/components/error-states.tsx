'use client'

// ============================================================================
// ExamForge AI OS — Consistent Error / Empty / Loading States
// ============================================================================
// AI OS design language: forge accent colors (no indigo), glass surfaces,
// staggered entrance animation, branded shimmer skeletons, proper ARIA,
// and contextual guidance. Every state is a first-class citizen.
// ============================================================================

import { type ReactNode } from 'react'
import Link from 'next/link'
import {
  Loader2,
  Inbox,
  AlertTriangle,
  Lock,
  ShieldX,
  FileQuestion,
  WifiOff,
  Timer,
  Home,
  ArrowLeft,
  RotateCw,
  LogIn,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────
// Shared Styles — AI OS Design Language
// ──────────────────────────────────────────────────────────────

const WRAPPER_CLASSES =
  'flex min-h-[280px] flex-col items-center justify-center p-6 text-center animate-fade-in'

const ICON_WRAPPER_CLASSES =
  'mx-auto flex h-16 w-16 items-center justify-center rounded-2xl'

const TITLE_CLASSES = 'mt-4 text-lg font-semibold tracking-tight text-foreground'
const DESCRIPTION_CLASSES = 'mt-2 max-w-md text-sm text-foreground/55'

// ──────────────────────────────────────────────────────────────
// LoadingState
// ──────────────────────────────────────────────────────────────

interface LoadingStateProps {
  /** Optional message to display below the spinner */
  message?: string
  /** Use skeleton layout instead of spinner */
  variant?: 'spinner' | 'skeleton'
  /** Number of skeleton lines (only for skeleton variant) */
  lines?: number
  /** Accessibility label */
  'aria-label'?: string
}

export function LoadingState({
  message,
  variant = 'spinner',
  lines = 4,
  'aria-label': ariaLabel,
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div
        className="w-full space-y-4 p-6 animate-fade-in"
        role="status"
        aria-label={ariaLabel ?? 'Loading content'}
        aria-busy="true"
      >
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={WRAPPER_CLASSES}
      role="status"
      aria-label={ariaLabel ?? 'Loading'}
      aria-busy="true"
    >
      <div className="relative">
        {/* Forge glow behind spinner */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-primary/15 blur-xl scale-[2]"
        />
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
      {message && <p className={DESCRIPTION_CLASSES}>{message}</p>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// EmptyState — Lightweight inline variant
// (For the premium version, use <EmptyState /> from ui/empty-state.tsx)
// ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Icon component (defaults to Inbox) */
  icon?: ReactNode
  /** Title text */
  title: string
  /** Description text */
  description?: string
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className={cn(WRAPPER_CLASSES, 'rounded-2xl border border-border/60 forge-glass-surface')}
      role="status"
    >
      <div
        className={cn(ICON_WRAPPER_CLASSES, 'bg-primary/10 text-primary ring-1 ring-primary/20')}
        aria-hidden="true"
      >
        {icon ?? <Inbox className="h-8 w-8" />}
      </div>
      <h3 className={TITLE_CLASSES}>{title}</h3>
      {description && <p className={DESCRIPTION_CLASSES}>{description}</p>}
      {action && (
        <Button
          onClick={action.onClick}
          className="mt-6 gap-2"
          aria-label={action.label}
        >
          {action.icon}
          {action.label}
          <ArrowRight className="h-4 w-4 opacity-70" aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// ErrorState
// ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  /** Error message to display */
  message: string
  /** Optional detailed info (shown in disclosure) */
  details?: string
  /** Retry callback */
  onRetry?: () => void
  /** Error digest / ID for support */
  errorId?: string
}

export function ErrorState({ message, details, onRetry, errorId }: ErrorStateProps) {
  return (
    <div
      className={cn(
        WRAPPER_CLASSES,
        'rounded-2xl border border-destructive/20',
        'bg-destructive/[0.03] dark:bg-destructive/[0.06]',
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="relative">
        {/* Error glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-destructive/10 blur-xl scale-[2]"
        />
        <div
          className={cn(
            ICON_WRAPPER_CLASSES,
            'bg-destructive/10 text-destructive',
            'ring-1 ring-destructive/20',
          )}
          aria-hidden="true"
        >
          <AlertTriangle className="h-8 w-8" />
        </div>
      </div>
      <h3 className={TITLE_CLASSES}>Something went wrong</h3>
      <p className={DESCRIPTION_CLASSES}>{message}</p>

      {errorId && (
        <p className="mt-1 text-xs text-foreground/55">
          Error ID: {errorId}
        </p>
      )}

      {details && (
        <details className="mt-3 w-full max-w-md">
          <summary className="cursor-pointer text-xs text-foreground/40 hover:text-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
            Technical details
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-muted p-3 text-left text-xs text-foreground/40">
            {details}
          </pre>
        </details>
      )}

      {onRetry && (
        <Button onClick={onRetry} className="mt-6 gap-2" aria-label="Retry">
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// UnauthorizedState (401)
// ──────────────────────────────────────────────────────────────

interface UnauthorizedStateProps {
  /** Custom message (defaults to standard 401 message) */
  message?: string
}

export function UnauthorizedState({ message }: UnauthorizedStateProps) {
  return (
    <div
      className={cn(
        WRAPPER_CLASSES,
        'rounded-2xl border border-primary/20 forge-glass-surface',
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-primary/10 blur-xl scale-[2]"
        />
        <div
          className={cn(
            ICON_WRAPPER_CLASSES,
            'bg-primary/10 text-primary ring-1 ring-primary/20',
          )}
          aria-hidden="true"
        >
          <Lock className="h-8 w-8" />
        </div>
      </div>
      <h3 className={TITLE_CLASSES}>Authentication required</h3>
      <p className={DESCRIPTION_CLASSES}>
        {message ??
          'You need to sign in to access this page. Please log in and try again.'}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button asChild aria-label="Sign in" className="gap-2">
          <Link href="/login">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// ForbiddenState (403)
// ──────────────────────────────────────────────────────────────

interface ForbiddenStateProps {
  /** Custom message */
  message?: string
  /** Name of the denied resource */
  resource?: string
}

export function ForbiddenState({ message, resource }: ForbiddenStateProps) {
  const description =
    message ??
    (resource
      ? `You don't have permission to access "${resource}". Contact your administrator if you believe this is an error.`
      : "You don't have permission to access this resource. Contact your administrator if you believe this is an error.")

  return (
    <div
      className={cn(
        WRAPPER_CLASSES,
        'rounded-2xl border border-destructive/20',
        'bg-destructive/[0.03] dark:bg-destructive/[0.06]',
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-destructive/10 blur-xl scale-[2]"
        />
        <div className="relative">
          <div
            className={cn(
              ICON_WRAPPER_CLASSES,
              'bg-destructive/10 text-destructive ring-1 ring-destructive/20',
            )}
            aria-hidden="true"
          >
            <ShieldX className="h-8 w-8" />
          </div>
          <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white ring-1 ring-destructive/50">
            403
          </div>
        </div>
      </div>
      <h3 className={TITLE_CLASSES}>Access denied</h3>
      <p className={DESCRIPTION_CLASSES}>{description}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" asChild aria-label="Go to dashboard" className="gap-2">
          <Link href="/dashboard">
            <Home className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// NotFoundState (404)
// ──────────────────────────────────────────────────────────────

interface NotFoundStateProps {
  /** Resource type that wasn't found */
  resource?: string
}

export function NotFoundState({ resource }: NotFoundStateProps) {
  const router = useRouter()
  const title = resource ? `${resource} not found` : 'Page not found'
  const description = resource
    ? `The ${resource.toLowerCase()} you're looking for doesn't exist or has been removed.`
    : "The page you're looking for doesn't exist or has been moved."

  return (
    <div
      className={cn(
        WRAPPER_CLASSES,
        'rounded-2xl border border-border/60 forge-glass-surface',
      )}
      role="status"
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-primary/10 blur-xl scale-[2]"
        />
        <div className="relative">
          <div
            className={cn(
              ICON_WRAPPER_CLASSES,
              'bg-primary/10 text-primary ring-1 ring-primary/20',
            )}
            aria-hidden="true"
          >
            <FileQuestion className="h-8 w-8" />
          </div>
          <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-1 ring-primary/50">
            404
          </div>
        </div>
      </div>
      <h3 className={TITLE_CLASSES}>{title}</h3>
      <p className={DESCRIPTION_CLASSES}>{description}</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          onClick={() => router.back()}
          aria-label="Go back"
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Go back
        </Button>
        <Button asChild aria-label="Go to dashboard" className="gap-2">
          <Link href="/dashboard">
            <Home className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// OfflineState
// ──────────────────────────────────────────────────────────────

interface OfflineStateProps {
  /** Retry callback */
  onRetry?: () => void
}

export function OfflineState({ onRetry }: OfflineStateProps) {
  return (
    <Card className="w-full max-w-sm mx-auto rounded-2xl border-amber-500/20 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] forge-card-shadow">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-amber-500/10 blur-lg scale-[1.8]"
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <WifiOff className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          You&apos;re offline
        </h3>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Check your internet connection and try again.
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-1 gap-2 border-amber-500/30 text-amber-900 hover:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/10"
            aria-label="Retry connection"
          >
            <RotateCw className="h-3 w-3" aria-hidden="true" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ──────────────────────────────────────────────────────────────
// RateLimitedState (429)
// ──────────────────────────────────────────────────────────────

interface RateLimitedStateProps {
  /** Seconds until the user can retry (from Retry-After header) */
  retryAfter?: number
  /** Retry callback */
  onRetry?: () => void
}

export function RateLimitedState({ retryAfter, onRetry }: RateLimitedStateProps) {
  const formattedRetry = retryAfter
    ? retryAfter >= 60
      ? `${Math.ceil(retryAfter / 60)} minute${Math.ceil(retryAfter / 60) > 1 ? 's' : ''}`
      : `${retryAfter} second${retryAfter > 1 ? 's' : ''}`
    : null

  return (
    <div
      className={cn(
        WRAPPER_CLASSES,
        'rounded-2xl border border-amber-500/20',
        'bg-amber-500/[0.04] dark:bg-amber-500/[0.06]',
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-amber-500/10 blur-xl scale-[2]"
        />
        <div
          className={cn(
            ICON_WRAPPER_CLASSES,
            'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            'ring-1 ring-amber-500/20',
          )}
          aria-hidden="true"
        >
          <Timer className="h-8 w-8" />
        </div>
      </div>
      <h3 className={cn(TITLE_CLASSES, 'text-amber-900 dark:text-amber-200')}>Too many requests</h3>
      <p className={DESCRIPTION_CLASSES}>
        You&apos;ve made too many requests in a short period.
        {formattedRetry
          ? ` Please wait ${formattedRetry} before trying again.`
          : ' Please wait a moment before trying again.'}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          className="mt-6 gap-2"
          disabled={retryAfter !== undefined && retryAfter > 0}
          aria-label={retryAfter ? `Retry after ${formattedRetry}` : 'Retry now'}
        >
          <RotateCw className="h-4 w-4" aria-hidden="true" />
          {retryAfter ? `Wait ${formattedRetry}` : 'Try again'}
        </Button>
      )}
    </div>
  )
}
