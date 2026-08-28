'use client'

// ============================================================================
// ExamForge AI OS — Global Error Boundary
// ============================================================================
// Catches React rendering errors anywhere in the component tree.
// - Shows user-friendly messages (never raw stack traces)
// - Provides retry + home navigation
// - Reports to Sentry via the observability layer
// - Supports variants: generic, auth, network, permission
// - AI OS design: forge glass surfaces, branded glow, staggered animation
// ============================================================================

import { Component, type ReactNode, type ErrorInfo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ShieldX,
  WifiOff,
  Lock,
  RotateCw,
  Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { captureException } from '@/lib/observability/sentry'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────
// Error Variant Configuration
// ──────────────────────────────────────────────────────────────

type ErrorVariant = 'generic' | 'auth' | 'network' | 'permission'

interface VariantConfig {
  icon: typeof AlertTriangle
  title: string
  description: string
  showRetry: boolean
  showHome: boolean
  /** Color tint for the icon container */
  tint: 'destructive' | 'primary' | 'amber'
}

const VARIANT_CONFIGS: Record<ErrorVariant, VariantConfig> = {
  generic: {
    icon: AlertTriangle,
    title: 'Something went wrong',
    description:
      "An unexpected error occurred. We've been notified and are working on a fix. Please try again.",
    showRetry: true,
    showHome: true,
    tint: 'destructive',
  },
  auth: {
    icon: Lock,
    title: 'Authentication error',
    description:
      'There was a problem verifying your identity. Please sign in again to continue.',
    showRetry: false,
    showHome: true,
    tint: 'primary',
  },
  network: {
    icon: WifiOff,
    title: 'Connection problem',
    description:
      "We couldn't reach the server. Please check your internet connection and try again.",
    showRetry: true,
    showHome: true,
    tint: 'amber',
  },
  permission: {
    icon: ShieldX,
    title: 'Permission denied',
    description:
      "You don't have the required permissions to view this content. Contact your administrator if you believe this is an error.",
    showRetry: false,
    showHome: true,
    tint: 'destructive',
  },
}

// ──────────────────────────────────────────────────────────────
// Tint styles for icon containers
// ──────────────────────────────────────────────────────────────

const tintStyles: Record<VariantConfig['tint'], { bg: string; text: string; ring: string; glow: string }> = {
  destructive: {
    bg: 'bg-destructive/10',
    text: 'text-destructive',
    ring: 'ring-1 ring-destructive/20',
    glow: 'bg-destructive/10',
  },
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary',
    ring: 'ring-1 ring-primary/20',
    glow: 'bg-primary/10',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-1 ring-amber-500/20',
    glow: 'bg-amber-500/10',
  },
}

// ──────────────────────────────────────────────────────────────
// Error Boundary Props & State
// ──────────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode
  /** Which variant to display. Auto-detected if not provided. */
  variant?: ErrorVariant
  /** Custom fallback component (overrides default UI) */
  fallback?: (_error: Error, _retry: () => void, _variant: ErrorVariant) => ReactNode
  /** Called when an error is caught, before Sentry reporting */
  onError?: (_error: Error, _errorInfo: ErrorInfo) => void
  /** Component name for Sentry tagging */
  name?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// ──────────────────────────────────────────────────────────────
// Auto-detect Error Variant
// ──────────────────────────────────────────────────────────────

function detectVariant(error: Error): ErrorVariant {
  const msg = error.message.toLowerCase()
  const name = error.name.toLowerCase()

  if (
    msg.includes('unauthorized') ||
    msg.includes('unauthenticated') ||
    msg.includes('401') ||
    name.includes('autherror')
  ) {
    return 'auth'
  }

  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('offline') ||
    msg.includes('failed to fetch') ||
    msg.includes('connrefused')
  ) {
    return 'network'
  }

  if (
    msg.includes('forbidden') ||
    msg.includes('permission') ||
    msg.includes('403') ||
    name.includes('permissionerror')
  ) {
    return 'permission'
  }

  return 'generic'
}

// ──────────────────────────────────────────────────────────────
// Error Boundary Component
// ──────────────────────────────────────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })

    // Report to Sentry with structured context
    const variant = this.props.variant ?? detectVariant(error)
    captureException(error, {
      tags: {
        component: this.props.name ?? 'ErrorBoundary',
        variant,
        errorBoundary: 'true',
      },
      extra: {
        componentStack: errorInfo.componentStack,
      },
    })

    // Also log to console (logger uses async_hooks which is server-only)
    console.error('[ExamForge AI] ErrorBoundary caught an error:', {
      message: error.message,
      component: this.props.name ?? 'ErrorBoundary',
      variant,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  override render(): ReactNode {
    if (!this.state.hasError || !this.state.error) {
      return this.props.children
    }

    const error = this.state.error
    const variant = this.props.variant ?? detectVariant(error)

    // Custom fallback takes priority
    if (this.props.fallback) {
      return this.props.fallback(error, this.handleRetry, variant)
    }

    return (
      <ErrorFallback
        error={error}
        variant={variant}
        onRetry={this.handleRetry}
        digest={(error as Error & { digest?: string }).digest}
      />
    )
  }
}

// ──────────────────────────────────────────────────────────────
// Error Fallback UI — AI OS Design
// ──────────────────────────────────────────────────────────────

interface ErrorFallbackProps {
  error: Error
  variant: ErrorVariant
  onRetry?: () => void
  digest?: string
}

export function ErrorFallback({ variant, onRetry, digest }: ErrorFallbackProps) {
  const config = VARIANT_CONFIGS[variant]
  const Icon = config.icon
  const tint = tintStyles[config.tint]

  return (
    <div
      className="flex min-h-[320px] items-center justify-center p-6 animate-fade-in"
      role="alert"
      aria-live="assertive"
    >
      <Card className="w-full max-w-md forge-glass-surface border border-border/30 rounded-2xl forge-card-shadow">
        <CardHeader className="text-center pb-2">
          <div className="relative mx-auto" aria-hidden="true">
            {/* Soft glow behind icon */}
            <div className={cn('pointer-events-none absolute inset-0 -z-10 rounded-2xl blur-xl scale-[2]', tint.glow)} />
            <div className={cn(
              'relative flex h-14 w-14 items-center justify-center rounded-2xl',
              tint.bg,
              tint.ring,
            )}>
              <Icon className={cn('h-7 w-7', tint.text)} />
            </div>
          </div>
          <CardTitle className="mt-4 text-xl">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-muted-foreground">{config.description}</p>

          {/* Show error digest for support purposes — never show raw message/stack */}
          {digest && (
            <p className="text-xs text-foreground/55">
              Error ID: {digest}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2 sm:flex-row">
            {config.showRetry && onRetry && (
              <Button onClick={onRetry} aria-label="Retry the failed action" className="gap-2">
                <RotateCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </Button>
            )}
            {config.showHome && (
              <Button variant="outline" asChild aria-label="Go to dashboard" className="gap-2">
                <Link href="/dashboard">
                  <Home className="h-4 w-4" aria-hidden="true" />
                  Dashboard
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Convenience Wrappers
// ──────────────────────────────────────────────────────────────

/** Pre-configured boundary for authentication-related sections */
export function AuthErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'variant'>) {
  return (
    <ErrorBoundary variant="auth" {...props}>
      {children}
    </ErrorBoundary>
  )
}

/** Pre-configured boundary for network-dependent sections */
export function NetworkErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'variant'>) {
  return (
    <ErrorBoundary variant="network" {...props}>
      {children}
    </ErrorBoundary>
  )
}

/** Pre-configured boundary for permission-gated sections */
export function PermissionErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'variant'>) {
  return (
    <ErrorBoundary variant="permission" {...props}>
      {children}
    </ErrorBoundary>
  )
}

// ──────────────────────────────────────────────────────────────
// Re-exports
// ──────────────────────────────────────────────────────────────

export type { ErrorVariant, ErrorBoundaryProps }
export { detectVariant }
