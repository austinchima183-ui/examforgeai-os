'use client'

// ============================================================================
// ExamForge AI — Debounced Callback Hook
// ============================================================================
// Typed debounced callback with:
// - Cancel and flush methods
// - Leading/trailing edge options
// - Automatic cleanup on unmount
// ============================================================================

import { useRef, useCallback, useEffect } from 'react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface DebounceOptions {
  /** Whether to invoke on the leading edge (default: false) */
  leading?: boolean
  /** Whether to invoke on the trailing edge (default: true) */
  trailing?: boolean
  /** Maximum time (ms) the debounced function can be delayed (default: Infinity) */
  maxWait?: number
}

interface DebouncedCallbackResult<T extends (..._args: unknown[]) => unknown> {
  /** The debounced callback function */
  call: (..._args: Parameters<T>) => void
  /** Cancel any pending execution */
  cancel: () => void
  /** Immediately execute any pending invocation */
  flush: () => void
  /** Whether there is a pending invocation */
  pending: () => boolean
}

// ──────────────────────────────────────────────────────────────
// useDebouncedCallback Hook
// ──────────────────────────────────────────────────────────────

/**
 * Typed debounced callback hook with cancel, flush, and edge options.
 *
 * @param fn - The callback to debounce
 * @param delay - Delay in milliseconds
 * @param options - Debounce options (leading/trailing edge, maxWait)
 * @returns Debounced callback result with call, cancel, and flush methods
 *
 * @example
 * ```tsx
 * // Basic debounce (trailing edge)
 * const search = useDebouncedCallback(
 *   (query: string) => fetchResults(query),
 *   300
 * )
 * search.call('hello')
 *
 * // With leading edge (fire immediately, then debounce)
 * const save = useDebouncedCallback(
 *   (data: FormData) => saveToServer(data),
 *   1000,
 *   { leading: true, trailing: false }
 * )
 *
 * // Cancel pending execution
 * search.cancel()
 *
 * // Flush (execute immediately)
 * search.flush()
 * ```
 */
function useDebouncedCallback<T extends (..._args: unknown[]) => unknown>(
  fn: T,
  delay: number,
  options: DebounceOptions = {}
): DebouncedCallbackResult<T> {
  const { leading = false, trailing = true, maxWait } = options

  const fnRef = useRef(fn)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastArgsRef = useRef<Parameters<T> | null>(null)
  const lastCallTimeRef = useRef<number>(0)
  const leadingCalledRef = useRef(false)

  // Keep fn ref up to date in an effect
  useEffect(() => {
    fnRef.current = fn
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current)
    }
  }, [])

  const invokeFunc = useCallback(() => {
    if (lastArgsRef.current !== null) {
      fnRef.current(...lastArgsRef.current)
      lastArgsRef.current = null
    }
    leadingCalledRef.current = false
    lastCallTimeRef.current = 0
  }, [])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
    lastArgsRef.current = null
    leadingCalledRef.current = false
    lastCallTimeRef.current = 0
  }, [])

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
    invokeFunc()
  }, [invokeFunc])

  const pending = useCallback(() => {
    return timerRef.current !== null || maxTimerRef.current !== null
  }, [])

  const call = useCallback(
    (..._args: Parameters<T>) => {
      const now = Date.now()
      lastArgsRef.current = _args

      // Leading edge: invoke immediately on first call
      if (leading && !leadingCalledRef.current && now - lastCallTimeRef.current > delay) {
        leadingCalledRef.current = true
        fnRef.current(..._args)
      }

      lastCallTimeRef.current = now

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Set new timer for trailing edge
      if (trailing) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null
          invokeFunc()
        }, delay)
      }

      // Max wait timer: ensure the function is called within maxWait
      if (maxWait && !maxTimerRef.current) {
        maxTimerRef.current = setTimeout(() => {
          maxTimerRef.current = null
          if (trailing && timerRef.current) {
            clearTimeout(timerRef.current)
            timerRef.current = null
          }
          invokeFunc()
        }, maxWait)
      }
    },
    [delay, leading, trailing, maxWait, invokeFunc]
  )

  return { call, cancel, flush, pending }
}

export { useDebouncedCallback }
export type { DebounceOptions, DebouncedCallbackResult }
