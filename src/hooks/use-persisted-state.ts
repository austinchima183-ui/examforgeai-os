'use client'

// ============================================================================
// ExamForge AI — Persisted State Hook
// ============================================================================
// localStorage-backed state with:
// - Type-safe serialization/deserialization
// - Cross-tab synchronization via storage events
// - Error handling for storage failures
// - SSR safety (no localStorage on server)
// ============================================================================

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface PersistedStateOptions<T> {
  /** Custom serializer (default: JSON.stringify) */
  serializer?: (_value: T) => string
  /** Custom deserializer (default: JSON.parse) */
  deserializer?: (_raw: string) => T
  /** Whether to sync across tabs (default: true) */
  syncAcrossTabs?: boolean
  /** Version key for migration — if changed, stored value is discarded */
  version?: number | string
}

interface PersistedStateResult<T> {
  /** The current value */
  value: T
  /** Set a new value (also persists to localStorage) */
  setValue: (_value: T | ((_prev: T) => T)) => void
  /** Remove the persisted value from localStorage and reset to default */
  remove: () => void
  /** Whether the value has been loaded from localStorage */
  isLoaded: boolean
  /** Whether localStorage is available */
  isAvailable: boolean
}

// ──────────────────────────────────────────────────────────────
// localStorage availability check
// ──────────────────────────────────────────────────────────────

let _isLocalStorageAvailable: boolean | null = null

function isLocalStorageAvailable(): boolean {
  if (_isLocalStorageAvailable !== null) return _isLocalStorageAvailable

  try {
    const testKey = '__examforge_storage_test__'
    localStorage.setItem(testKey, '1')
    localStorage.removeItem(testKey)
    _isLocalStorageAvailable = true
  } catch {
    _isLocalStorageAvailable = false
  }

  return _isLocalStorageAvailable
}

// ──────────────────────────────────────────────────────────────
// Storage key helpers
// ──────────────────────────────────────────────────────────────

function getStorageKey(key: string, version?: number | string): string {
  if (version !== undefined) {
    return `examforge:${key}:v${version}`
  }
  return `examforge:${key}`
}

// ──────────────────────────────────────────────────────────────
// Simple subscribe/getServerSnapshot for useSyncExternalStore
// ──────────────────────────────────────────────────────────────

function subscribeToStorage(callback: () => void): () => void {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

// ──────────────────────────────────────────────────────────────
// usePersistedState Hook
// ──────────────────────────────────────────────────────────────

/**
 * localStorage-backed state hook with type safety and cross-tab sync.
 *
 * Features:
 * - Persists state to localStorage automatically
 * - Type-safe with generics
 * - Syncs state changes across browser tabs
 * - Custom serialization/deserialization
 * - Error handling for storage failures
 * - SSR safe (checks for localStorage availability)
 * - Version support for cache busting
 *
 * @param key - localStorage key (prefixed with 'examforge:')
 * @param defaultValue - Default value if nothing is stored
 * @param options - Configuration options
 * @returns Persisted state result
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { value: theme, setValue: setTheme } = usePersistedState('theme', 'light')
 *
 * // With cross-tab sync
 * const { value: settings, setValue: setSettings } = usePersistedState(
 *   'user-settings',
 *   { notifications: true, language: 'en' },
 *   { syncAcrossTabs: true }
 * )
 *
 * // With version (old values are discarded)
 * const { value: data, setValue: setData } = usePersistedState(
 *   'cached-data',
 *   [],
 *   { version: 2 }
 * )
 *
 * // Custom serialization
 * const { value: date, setValue: setDate } = usePersistedState(
 *   'selected-date',
 *   new Date(),
 *   {
 *     serializer: (d) => d.toISOString(),
 *     deserializer: (s) => new Date(s),
 *   }
 * )
 * ```
 */
function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options: PersistedStateOptions<T> = {}
): PersistedStateResult<T> {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    syncAcrossTabs = true,
    version,
  } = options

  const storageAvailable = isLocalStorageAvailable()
  const storageKey = getStorageKey(key, version)
  const defaultValueRef = useRef(defaultValue)

  // Keep defaultValueRef in sync
  useEffect(() => {
    defaultValueRef.current = defaultValue
  })

  // Read initial value from localStorage
  const readFromStorage = useCallback((): T => {
    if (!storageAvailable) return defaultValueRef.current

    try {
      const raw = localStorage.getItem(storageKey)
      if (raw !== null) {
        return deserializer(raw) as T
      }
    } catch {
      // Deserialization failed — use default
    }

    return defaultValueRef.current
  }, [storageKey, deserializer, storageAvailable])

  // Use useSyncExternalStore for cross-tab sync when enabled
  const storageSnapshot = useSyncExternalStore(
    syncAcrossTabs && storageAvailable
      ? subscribeToStorage
      : () => () => {}, // noop when sync disabled
    readFromStorage,
    () => defaultValueRef.current // server snapshot
  )

  const [value, setValueInternal] = useState<T>(storageSnapshot)

  // Sync from external store changes
  useEffect(() => {
    setValueInternal(storageSnapshot)
  }, [storageSnapshot])

  // Persist to localStorage whenever value changes
  useEffect(() => {
    if (!storageAvailable) return

    try {
      const serialized = serializer(value)
      localStorage.setItem(storageKey, serialized)
    } catch (err) {
      // Storage full or other error — silently fail
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.warn(`[usePersistedState] Failed to persist key "${key}":`, err)
      }
    }
  }, [value, storageKey, serializer, storageAvailable, key])

  const setValue = useCallback(
    (newValue: T | ((_prev: T) => T)) => {
      setValueInternal((prev) => {
        const resolved =
          typeof newValue === 'function'
            ? (newValue as (_prev: T) => T)(prev)
            : newValue
        return resolved
      })
    },
    []
  )

  const remove = useCallback(() => {
    if (!storageAvailable) return

    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Silently fail
    }

    setValueInternal(defaultValueRef.current)
  }, [storageKey, storageAvailable])

  return {
    value,
    setValue,
    remove,
    isLoaded: true, // Always true since we read synchronously from localStorage
    isAvailable: storageAvailable,
  }
}

export { usePersistedState }
export type { PersistedStateOptions, PersistedStateResult }
