// ============================================================================
// ExamForge AI — Debounce Hook (Re-export)
// ============================================================================
// Canonical implementation lives in @/hooks/use-debounced-callback.
// This file provides backward-compatible re-exports for existing imports
// from @/lib/hooks/use-debounce.
//
// useDebouncedCallback here is a simpler wrapper around the canonical
// useDebouncedCallback from @/hooks/use-debounced-callback.
// ============================================================================

import { useState, useEffect } from 'react'
import { useDebouncedCallback as useDebouncedCallbackFull } from '@/hooks/use-debounced-callback'

/**
 * Debounce a value by a specified delay.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Backward-compatible simple debounced callback.
 * Wraps the canonical useDebouncedCallback from @/hooks/use-debounced-callback.
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 300
): T {
  const { call } = useDebouncedCallbackFull(callback, delay)
  return call as T
}
