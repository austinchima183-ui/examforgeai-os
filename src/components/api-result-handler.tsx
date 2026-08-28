'use client'

// ============================================================================
// ExamForge AI — API Result Handler
// ============================================================================
// Takes a TanStack Query result object (or any { status, data, error, refetch })
// and renders the appropriate state: loading, error, success (empty), success.
//
// Provides consistent error handling across all pages with:
//   - Loading skeleton/spinner
//   - Error state with retry
//   - Empty state for empty data
//   - Customizable empty check
//   - Unauthorized / Forbidden auto-detection
// ============================================================================

import { type ReactNode } from 'react'
import {
  LoadingState,
  ErrorState,
  EmptyState,
  UnauthorizedState,
  ForbiddenState,
  NotFoundState,
  RateLimitedState,
} from '@/components/error-states'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

/** API result status values */
type ApiStatus = 'idle' | 'pending' | 'error' | 'success'

/** A simplified API result shape compatible with TanStack Query */
interface ApiResult<T> {
  /** Query status */
  status: ApiStatus
  /** The data when the query succeeds */
  data: T | undefined
  /** The error when the query fails */
  error: Error | null
  /** Refetch / retry function */
  refetch: () => void
  /** Whether data is currently being fetched (includes background refetch) */
  isFetching?: boolean
  /** HTTP status code if available */
  statusCode?: number
}

interface ApiResultHandlerProps<T> {
  /** The API result to handle */
  result: ApiResult<T>
  /** Render function for successful data */
  children: (_data: T) => ReactNode
  /** Custom loading message */
  loadingMessage?: string
  /** Use skeleton instead of spinner for loading */
  loadingVariant?: 'spinner' | 'skeleton'
  /** Custom empty check — return true if data should be considered empty */
  isEmpty?: (_data: T) => boolean
  /** Custom empty state props */
  emptyProps?: {
    title: string
    description?: string
    icon?: ReactNode
    action?: {
      label: string
      onClick: () => void
      icon?: ReactNode
    }
  }
  /** Custom error message override */
  errorMessage?: string
  /** Show error details in collapsible section */
  showErrorDetails?: boolean
  /** Custom loading component */
  loadingComponent?: ReactNode
  /** Custom error component */
  errorComponent?: (_error: Error, _retry: () => void) => ReactNode
  /** Custom empty component */
  emptyComponent?: ReactNode
  /** Accessibility label for the region */
  'aria-label'?: string
}

// ──────────────────────────────────────────────────────────────
// Error Classification
// ──────────────────────────────────────────────────────────────

type ErrorClass =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'network'
  | 'server'
  | 'unknown'

function classifyError(error: Error, statusCode?: number): ErrorClass {
  // Check HTTP status code first
  if (statusCode === 401) return 'unauthorized'
  if (statusCode === 403) return 'forbidden'
  if (statusCode === 404) return 'not_found'
  if (statusCode === 429) return 'rate_limited'
  if (statusCode && statusCode >= 500) return 'server'
  if (statusCode && statusCode >= 400) return 'unknown'

  // Fall back to message inspection
  const msg = error.message.toLowerCase()
  if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('unauthenticated')) {
    return 'unauthorized'
  }
  if (msg.includes('forbidden') || msg.includes('403') || msg.includes('permission')) {
    return 'forbidden'
  }
  if (msg.includes('not found') || msg.includes('404')) {
    return 'not_found'
  }
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many')) {
    return 'rate_limited'
  }
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('offline') ||
    msg.includes('failed to fetch')
  ) {
    return 'network'
  }
  if (msg.includes('500') || msg.includes('internal server')) {
    return 'server'
  }

  return 'unknown'
}

// ──────────────────────────────────────────────────────────────
// Extract retry-after from error
// ──────────────────────────────────────────────────────────────

function extractRetryAfter(error: Error): number | undefined {
  const err = error as Error & { retryAfter?: number }
  return err.retryAfter
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export function ApiResultHandler<T>({
  result,
  children,
  loadingMessage,
  loadingVariant = 'spinner',
  isEmpty,
  emptyProps,
  errorMessage,
  showErrorDetails = false,
  loadingComponent,
  errorComponent,
  emptyComponent,
  'aria-label': ariaLabel,
}: ApiResultHandlerProps<T>) {
  const { status, data, error, refetch, statusCode } = result

  // ── Idle state ──
  if (status === 'idle') {
    return (
      <div role="status" aria-label={ariaLabel ?? 'Waiting to load'}>
        {loadingComponent ?? (
          <LoadingState message={loadingMessage ?? 'Ready to load'} variant={loadingVariant} />
        )}
      </div>
    )
  }

  // ── Loading state ──
  if (status === 'pending') {
    return (
      <div role="status" aria-label={ariaLabel ?? 'Loading'} aria-busy="true">
        {loadingComponent ?? (
          <LoadingState
            message={loadingMessage ?? 'Loading...'}
            variant={loadingVariant}
          />
        )}
      </div>
    )
  }

  // ── Error state ──
  if (status === 'error' && error) {
    // Custom error component takes priority
    if (errorComponent) {
      return (
        <div role="alert" aria-label={ariaLabel ?? 'Error'}>
          {errorComponent(error, refetch)}
        </div>
      )
    }

    // Classify and render appropriate state
    const errorClass = classifyError(error, statusCode)

    switch (errorClass) {
      case 'unauthorized':
        return <UnauthorizedState message={errorMessage} />

      case 'forbidden':
        return <ForbiddenState message={errorMessage} />

      case 'not_found':
        return <NotFoundState />

      case 'rate_limited':
        return (
          <RateLimitedState
            retryAfter={extractRetryAfter(error)}
            onRetry={refetch}
          />
        )

      case 'network':
        return (
          <ErrorState
            message={errorMessage ?? 'Unable to connect to the server. Please check your connection and try again.'}
            onRetry={refetch}
            details={showErrorDetails ? error.message : undefined}
          />
        )

      case 'server':
        return (
          <ErrorState
            message={errorMessage ?? 'The server encountered an error. Please try again later.'}
            onRetry={refetch}
            details={showErrorDetails ? error.message : undefined}
          />
        )

      default:
        return (
          <ErrorState
            message={errorMessage ?? error.message ?? 'An unexpected error occurred.'}
            onRetry={refetch}
            details={showErrorDetails ? error.stack : undefined}
            errorId={(error as Error & { digest?: string }).digest}
          />
        )
    }
  }

  // ── Success state ──
  if (status === 'success' && data !== undefined) {
    // Check if data is "empty"
    const dataIsEmpty = isEmpty ? isEmpty(data) : defaultIsEmpty(data)

    if (dataIsEmpty) {
      if (emptyComponent) return <div role="status">{emptyComponent}</div>

      return (
        <EmptyState
          title={emptyProps?.title ?? 'No data found'}
          description={emptyProps?.description}
          icon={emptyProps?.icon}
          action={emptyProps?.action}
        />
      )
    }

    // Data is present — render children
    return <>{children(data)}</>
  }

  // ── Fallback: success but no data (and not explicitly empty) ──
  if (emptyComponent) return <div role="status">{emptyComponent}</div>

  return (
    <EmptyState
      title={emptyProps?.title ?? 'No data available'}
      description={emptyProps?.description}
    />
  )
}

// ──────────────────────────────────────────────────────────────
// Default Empty Check
// ──────────────────────────────────────────────────────────────

function defaultIsEmpty(data: unknown): boolean {
  if (data === null || data === undefined) return true
  if (Array.isArray(data)) return data.length === 0
  if (typeof data === 'string') return data.length === 0
  if (typeof data === 'object') return Object.keys(data as object).length === 0
  return false
}

// ──────────────────────────────────────────────────────────────
// Utility: Create compatible ApiResult from TanStack Query
// ──────────────────────────────────────────────────────────────

/**
 * Adapt a TanStack Query result to our ApiResult shape.
 *
 * @example
 * ```tsx
 * const query = useQuery({ queryKey: ['exams'], queryFn: fetchExams })
 * const result = toApiResult(query)
 *
 * return (
 *   <ApiResultHandler result={result}>
 *     {(exams) => <ExamList exams={exams} />}
 *   </ApiResultHandler>
 * )
 * ```
 */
export function toApiResult<T>(
  query: {
    status: string
    data: T | undefined
    error: Error | null
    refetch: () => void
    isFetching?: boolean
    fetchStatus?: string
  }
): ApiResult<T> {
  return {
    status: query.status as ApiStatus,
    data: query.data,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  }
}

// ──────────────────────────────────────────────────────────────
// Re-exports
// ──────────────────────────────────────────────────────────────

export type { ApiResult, ApiStatus, ApiResultHandlerProps }
export { classifyError }
