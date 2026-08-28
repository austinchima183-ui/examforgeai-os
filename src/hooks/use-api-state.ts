// ============================================================================
// ExamForge AI — API State Hook
// ============================================================================
// Manages loading/error/data states for API calls with:
//   - execute, retry, reset functions
//   - Auto-retry on network error (up to 3 attempts with exponential backoff)
//   - Error type classification (network, auth, validation, server, unknown)
//   - TypeScript-safe generic data type
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react'
import { captureException } from '@/lib/observability/sentry'

// ──────────────────────────────────────────────────────────────
// Error Type Classification
// ──────────────────────────────────────────────────────────────

export type ApiErrorType =
  | 'network'   // Connection failed, offline, DNS error
  | 'auth'      // 401 Unauthorized
  | 'validation' // 400, 422 — bad input
  | 'permission' // 403 Forbidden
  | 'not_found' // 404
  | 'rate_limit' // 429 Too Many Requests
  | 'server'    // 500+ Internal server error
  | 'unknown'   // Anything else

export interface ClassifiedError {
  type: ApiErrorType
  message: string
  statusCode?: number
  retryAfter?: number
  original: Error
}

// ──────────────────────────────────────────────────────────────
// Classify an error into its type
// ──────────────────────────────────────────────────────────────

function classifyApiError(error: Error): ClassifiedError {
  const msg = error.message.toLowerCase()

  // Check for status code in error message patterns
  const statusMatch = msg.match(/\b(\d{3})\b/)
  const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : undefined

  // 401
  if (
    statusCode === 401 ||
    msg.includes('unauthorized') ||
    msg.includes('unauthenticated')
  ) {
    return {
      type: 'auth',
      message: 'Authentication required. Please sign in again.',
      statusCode: 401,
      original: error,
    }
  }

  // 403
  if (
    statusCode === 403 ||
    msg.includes('forbidden') ||
    msg.includes('permission denied')
  ) {
    return {
      type: 'permission',
      message: "You don't have permission to perform this action.",
      statusCode: 403,
      original: error,
    }
  }

  // 404
  if (statusCode === 404 || msg.includes('not found')) {
    return {
      type: 'not_found',
      message: 'The requested resource was not found.',
      statusCode: 404,
      original: error,
    }
  }

  // 422 / 400
  if (
    statusCode === 422 ||
    statusCode === 400 ||
    msg.includes('validation') ||
    msg.includes('invalid')
  ) {
    return {
      type: 'validation',
      message: 'Please check your input and try again.',
      statusCode: statusCode ?? 400,
      original: error,
    }
  }

  // 429
  if (statusCode === 429 || msg.includes('rate limit') || msg.includes('too many requests')) {
    const retryAfter = (error as Error & { retryAfter?: number }).retryAfter
    return {
      type: 'rate_limit',
      message: 'Too many requests. Please wait before trying again.',
      statusCode: 429,
      retryAfter,
      original: error,
    }
  }

  // 500+
  if ((statusCode && statusCode >= 500) || msg.includes('internal server')) {
    return {
      type: 'server',
      message: 'A server error occurred. Please try again later.',
      statusCode,
      original: error,
    }
  }

  // Network errors
  if (
    msg.includes('network') ||
    msg.includes('fetch') ||
    msg.includes('offline') ||
    msg.includes('failed to fetch') ||
    msg.includes('connrefused') ||
    msg.includes('enetunreach') ||
    msg.includes('timeout') ||
    error.name === 'TypeError' // fetch() throws TypeError on network failure
  ) {
    return {
      type: 'network',
      message: 'Unable to connect. Please check your internet connection.',
      original: error,
    }
  }

  return {
    type: 'unknown',
    message: error.message || 'An unexpected error occurred.',
    statusCode,
    original: error,
  }
}

// ──────────────────────────────────────────────────────────────
// Hook Configuration
// ──────────────────────────────────────────────────────────────

interface UseApiStateConfig {
  /** Maximum auto-retry attempts for network errors (default: 3) */
  maxRetries?: number
  /** Base delay in ms for exponential backoff (default: 1000) */
  retryDelay?: number
  /** Whether to auto-retry on network errors (default: true) */
  autoRetryNetwork?: boolean
  /** Callback when error type is 'auth' — typically redirect to login */
  onAuthError?: () => void
  /** Callback on any error */
  onError?: (_classified: ClassifiedError) => void
  /** Callback on success */
  onSuccess?: (_data: unknown) => void
  /** Component name for Sentry tags */
  name?: string
}

// ──────────────────────────────────────────────────────────────
// Hook State
// ──────────────────────────────────────────────────────────────

interface UseApiStateReturn<T> {
  /** The data (null until successful execution) */
  data: T | null
  /** Whether an operation is in progress */
  loading: boolean
  /** Classified error (null when no error) */
  error: ClassifiedError | null
  /** Raw error (null when no error) */
  rawError: Error | null
  /** Current retry attempt number (0 = first attempt) */
  retryCount: number
  /** Error type shortcut */
  errorType: ApiErrorType | null

  /** Execute the async function */
  execute: (_fn: () => Promise<T>) => Promise<T | null>
  /** Retry the last executed function */
  retry: () => Promise<T | null>
  /** Reset to initial state */
  reset: () => void
}

// ──────────────────────────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────────────────────────

export function useApiState<T = unknown>(
  config: UseApiStateConfig = {}
): UseApiStateReturn<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    autoRetryNetwork = true,
    onAuthError,
    onError,
    onSuccess,
    name = 'useApiState',
  } = config

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ClassifiedError | null>(null)
  const [rawError, setRawError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Store the last executed function for retry
  const lastFnRef = useRef<(() => Promise<T>) | null>(null)
  // Track mounted state
  const mountedRef = useRef(true)
  // Track abort for cleanup
  const abortRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current = true
    }
  }, [])

  const handleError = useCallback(
    (err: Error, attempt: number): ClassifiedError => {
      const classified = classifyApiError(err)

      // Report to Sentry (skip network retries that will auto-retry)
      if (!(classified.type === 'network' && attempt < maxRetries && autoRetryNetwork)) {
        captureException(err, {
          tags: {
            component: name,
            errorType: classified.type,
            attempt: String(attempt),
          },
        })
      }

      // Log to console (logger uses async_hooks which is server-only)
      console.error(`[ExamForge AI] ${name} error:`, {
        message: err.message,
        errorType: classified.type,
        statusCode: classified.statusCode,
        attempt,
      })

      // Call error callback
      onError?.(classified)

      // Handle auth error redirect
      if (classified.type === 'auth') {
        onAuthError?.()
      }

      return classified
    },
    [name, maxRetries, autoRetryNetwork, onError, onAuthError]
  )

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T | null> => {
      // Store for retry
      lastFnRef.current = fn
      abortRef.current = false

      if (!mountedRef.current) return null

      setLoading(true)
      setError(null)
      setRawError(null)
      setRetryCount(0)

      let attempt = 0

      while (attempt <= maxRetries) {
        try {
          const result = await fn()

          if (!mountedRef.current || abortRef.current) return result

          setData(result)
          setLoading(false)
          setError(null)
          setRawError(null)
          setRetryCount(0)

          onSuccess?.(result)

          return result
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err))

          if (!mountedRef.current || abortRef.current) {
            return null
          }

          const classified = handleError(error, attempt)

          // Auto-retry on network errors
          if (
            autoRetryNetwork &&
            classified.type === 'network' &&
            attempt < maxRetries
          ) {
            attempt++
            setRetryCount(attempt)

            // Exponential backoff: 1s, 2s, 4s, ...
            const delay = retryDelay * Math.pow(2, attempt - 1)

            console.info(`[ExamForge AI] ${name} auto-retry:`, {
              attempt,
              delay,
              errorType: classified.type,
            })

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay))

            if (!mountedRef.current || abortRef.current) return null

            continue
          }

          // No more retries — set error state
          setError(classified)
          setRawError(error)
          setLoading(false)

          return null
        }
      }

      // All retries exhausted
      setLoading(false)
      return null
    },
    [maxRetries, retryDelay, autoRetryNetwork, handleError, name, onSuccess]
  )

  const retry = useCallback(async (): Promise<T | null> => {
    if (lastFnRef.current) {
      const fn = lastFnRef.current
      setError(null)
      setRawError(null)
      setRetryCount(0)
      return execute(fn)
    }
    return null
  }, [execute])

  const reset = useCallback(() => {
    abortRef.current = true
    setData(null)
    setLoading(false)
    setError(null)
    setRawError(null)
    setRetryCount(0)
    lastFnRef.current = null
  }, [])

  return {
    data,
    loading,
    error,
    rawError,
    retryCount,
    errorType: error?.type ?? null,
    execute,
    retry,
    reset,
  }
}

// ──────────────────────────────────────────────────────────────
// Re-exports
// ──────────────────────────────────────────────────────────────

export type { UseApiStateConfig, UseApiStateReturn }
export { classifyApiError }
