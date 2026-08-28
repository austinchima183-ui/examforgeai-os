'use client'

// ============================================================================
// ExamForge AI — Unified Async Action Hook
// ============================================================================
// Replaces scattered useState patterns for async operations.
// Provides a single, consistent API for:
// - Loading, success, and error states
// - Automatic error handling
// - Retry support with exponential backoff
// - Optimistic updates
// - Deduplication of concurrent calls
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface AsyncActionState<T> {
  /** The result data */
  data: T | null
  /** Error if the action failed */
  error: Error | null
  /** Whether the action is currently executing */
  isLoading: boolean
  /** Whether the action completed successfully */
  isSuccess: boolean
  /** Whether the action failed */
  isError: boolean
}

interface AsyncActionOptions<T> {
  /** Callback when action succeeds */
  onSuccess?: (_data: T) => void
  /** Callback when action fails */
  onError?: (_error: Error) => void
  /** Callback when action completes (success or failure) */
  onSettled?: (_data: T | null, _error: Error | null) => void
  /** Maximum number of retries (default: 0) */
  maxRetries?: number
  /** Base delay between retries in ms (default: 1000) */
  retryDelay?: number
  /** Whether to use exponential backoff for retries (default: true) */
  exponentialBackoff?: boolean
  /** Enable deduplication of concurrent calls (default: true) */
  deduplicate?: boolean
  /** Initial data value */
  initialData?: T
}

interface AsyncActionResult<T, A extends unknown[]> extends AsyncActionState<T> {
  /** Execute the async action */
  execute: (..._args: A) => Promise<T | null>
  /** Reset state to initial values */
  reset: () => void
  /** Manually set data (for optimistic updates) */
  setData: (_data: T | null) => void
  /** Number of retry attempts made */
  retryCount: number
  /** Whether a retry is possible */
  canRetry: boolean
  /** Manually trigger a retry with the last arguments */
  retry: () => Promise<T | null>
}

// ──────────────────────────────────────────────────────────────
// Default State
// ──────────────────────────────────────────────────────────────

function getInitialState<T>(initialData?: T): AsyncActionState<T> {
  return {
    data: initialData ?? null,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  }
}

// ──────────────────────────────────────────────────────────────
// useAsyncAction Hook
// ──────────────────────────────────────────────────────────────

/**
 * Unified async action hook that replaces scattered useState patterns.
 *
 * Provides a consistent API for async operations with:
 * - Automatic loading/success/error state management
 * - Retry support with exponential backoff
 * - Optimistic updates via `setData`
 * - Deduplication of concurrent calls
 *
 * @param fn - The async function to execute
 * @param options - Configuration options
 * @returns Action state and control methods
 *
 * @example
 * ```tsx
 * const { execute, isLoading, error, data } = useAsyncAction(
 *   async (examId: string) => {
 *     const res = await fetch(`/api/exams/${examId}`)
 *     if (!res.ok) throw new Error('Failed to fetch exam')
 *     return res.json()
 *   },
 *   {
 *     onSuccess: (data) => toast.success('Exam loaded'),
 *     onError: (err) => toast.error(err.message),
 *     maxRetries: 3,
 *   }
 * )
 *
 * // Execute
 * await execute('exam-123')
 *
 * // Optimistic update
 * setData({ ...data, title: 'New Title' })
 * ```
 */
function useAsyncAction<T, A extends unknown[] = []>(
  fn: (..._args: A) => Promise<T>,
  options: AsyncActionOptions<T> = {}
): AsyncActionResult<T, A> {
  const {
    onSuccess,
    onError,
    onSettled,
    maxRetries = 0,
    retryDelay = 1000,
    exponentialBackoff = true,
    deduplicate = true,
    initialData,
  } = options

  const [state, setState] = useState<AsyncActionState<T>>(() =>
    getInitialState(initialData)
  )
  const [retryCount, setRetryCount] = useState(0)

  // Track the last arguments for retry
  const lastArgsRef = useRef<A | null>(null)

  // Track in-flight request for deduplication
  const inflightRef = useRef<Promise<T | null> | null>(null)

  // Track mounted state
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const reset = useCallback(() => {
    setState(getInitialState(initialData))
    setRetryCount(0)
    lastArgsRef.current = null
  }, [initialData])

  const setData = useCallback((newData: T | null) => {
    setState((prev) => ({
      ...prev,
      data: newData,
    }))
  }, [])

  const execute = useCallback(
    async (...args: A): Promise<T | null> => {
      // Deduplication: if a call is already in flight, return it
      if (deduplicate && inflightRef.current) {
        return inflightRef.current
      }

      lastArgsRef.current = args

      const attemptExecution = async (attempt: number): Promise<T | null> => {
        if (!mountedRef.current) return null

        setState({
          data: initialData ?? null,
          error: null,
          isLoading: true,
          isSuccess: false,
          isError: false,
        })

        try {
          const result = await fn(...args)

          if (!mountedRef.current) return null

          setState({
            data: result,
            error: null,
            isLoading: false,
            isSuccess: true,
            isError: false,
          })
          setRetryCount(0)

          onSuccess?.(result)
          onSettled?.(result, null)

          inflightRef.current = null
          return result
        } catch (err) {
          if (!mountedRef.current) return null

          const error = err instanceof Error ? err : new Error(String(err))

          // Check if we should retry
          if (attempt < maxRetries) {
            setRetryCount(attempt + 1)

            // Calculate delay
            let delay = retryDelay
            if (exponentialBackoff) {
              delay = retryDelay * Math.pow(2, attempt)
              // Add jitter to prevent thundering herd
              delay = delay * (0.5 + Math.random() * 0.5)
            }

            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, delay))

            return attemptExecution(attempt + 1)
          }

          // No more retries — set error state
          setState({
            data: initialData ?? null,
            error,
            isLoading: false,
            isSuccess: false,
            isError: true,
          })
          setRetryCount(attempt)

          onError?.(error)
          onSettled?.(null, error)

          inflightRef.current = null
          return null
        }
      }

      const promise = attemptExecution(0)
      inflightRef.current = promise
      return promise
    },
    [
      fn,
      onSuccess,
      onError,
      onSettled,
      maxRetries,
      retryDelay,
      exponentialBackoff,
      deduplicate,
      initialData,
    ]
  )

  const retry = useCallback(async (): Promise<T | null> => {
    if (lastArgsRef.current) {
      setRetryCount(0)
      return execute(...lastArgsRef.current)
    }
    return null
  }, [execute])

  const canRetry = retryCount > 0 && retryCount <= (maxRetries ?? 0)

  return {
    ...state,
    execute,
    reset,
    setData,
    retryCount,
    canRetry,
    retry,
  }
}

export { useAsyncAction }
export type {
  AsyncActionState,
  AsyncActionOptions,
  AsyncActionResult,
}
