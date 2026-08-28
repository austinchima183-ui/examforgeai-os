'use client'

// ============================================================================
// ExamForge AI — High Contrast Support
// ============================================================================
// Detects prefers-contrast: more and provides:
// - High-contrast class on body
// - Enhanced focus indicators
// - Stronger borders and text contrast
// - Toggle component for manual override
// WCAG 2.2 AA: 1.4.6 Contrast (Enhanced), 1.4.11 Non-text Contrast
// ============================================================================

import * as React from 'react'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const HIGH_CONTRAST_CLASS = 'high-contrast'
const STORAGE_KEY = 'examforge-high-contrast-override'

// ──────────────────────────────────────────────────────────────
// High Contrast Detection & Management
// ──────────────────────────────────────────────────────────────

type ContrastPreference = 'more' | 'less' | 'no-preference' | null

/**
 * Get the system preference for contrast.
 */
function getSystemContrastPreference(): ContrastPreference {
  if (typeof window === 'undefined') return null
  const mediaQuery = window.matchMedia('(prefers-contrast: more)')
  if (mediaQuery.matches) return 'more'
  const lessQuery = window.matchMedia('(prefers-contrast: less)')
  if (lessQuery.matches) return 'less'
  return 'no-preference'
}

/**
 * Get the stored manual override.
 */
function getStoredOverride(): boolean | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
    return null
  } catch {
    return null
  }
}

/**
 * Store a manual override preference.
 */
function setStoredOverride(value: boolean | null) {
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, String(value))
    }
  } catch {
    // localStorage not available
  }
}

/**
 * Apply or remove the high contrast class on the document.
 */
function applyHighContrastClass(enabled: boolean) {
  if (typeof document === 'undefined') return
  if (enabled) {
    document.documentElement.classList.add(HIGH_CONTRAST_CLASS)
    document.body.classList.add(HIGH_CONTRAST_CLASS)
  } else {
    document.documentElement.classList.remove(HIGH_CONTRAST_CLASS)
    document.body.classList.remove(HIGH_CONTRAST_CLASS)
  }
}

// ──────────────────────────────────────────────────────────────
// useHighContrast Hook
// ──────────────────────────────────────────────────────────────

interface UseHighContrastReturn {
  /** Whether high contrast mode is currently active */
  isHighContrast: boolean
  /** The system preference for contrast */
  systemPreference: ContrastPreference
  /** Whether there's a manual override active */
  hasOverride: boolean
  /** Toggle high contrast on/off (manual override) */
  toggle: () => void
  /** Set high contrast explicitly */
  setHighContrast: (_enabled: boolean) => void
  /** Reset to system preference (remove override) */
  resetToSystem: () => void
}

/**
 * Hook for detecting and controlling high contrast mode.
 *
 * - Detects `prefers-contrast: more` from the OS
 * - Supports manual override with localStorage persistence
 * - Applies `high-contrast` class to `<html>` and `<body>`
 * - Syncs across tabs via storage events
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isHighContrast, toggle } = useHighContrast()
 *   return (
 *     <div className={isHighContrast ? 'border-2 border-black' : 'border border-border'}>
 *       Content
 *     </div>
 *   )
 * }
 * ```
 */
function useHighContrast(): UseHighContrastReturn {
  const [systemPreference, setSystemPreference] = React.useState<ContrastPreference>(
    getSystemContrastPreference()
  )
  const [override, setOverride] = React.useState<boolean | null>(getStoredOverride)

  // Listen for system preference changes
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)')
    const lessQuery = window.matchMedia('(prefers-contrast: less)')

    const handler = () => setSystemPreference(getSystemContrastPreference())

    mediaQuery.addEventListener('change', handler)
    lessQuery.addEventListener('change', handler)
    return () => {
      mediaQuery.removeEventListener('change', handler)
      lessQuery.removeEventListener('change', handler)
    }
  }, [])

  // Listen for cross-tab storage changes
  React.useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setOverride(getStoredOverride())
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // Compute effective high contrast state
  const isHighContrast = override !== null ? override : systemPreference === 'more'

  // Apply class when state changes
  React.useEffect(() => {
    applyHighContrastClass(isHighContrast)
  }, [isHighContrast])

  const toggle = React.useCallback(() => {
    setOverride((_prev) => {
      const next = _prev !== null ? !_prev : !isHighContrast
      setStoredOverride(next)
      return next
    })
  }, [isHighContrast])

  const setHighContrast = React.useCallback((enabled: boolean) => {
    setOverride(enabled)
    setStoredOverride(enabled)
  }, [])

  const resetToSystem = React.useCallback(() => {
    setOverride(null)
    setStoredOverride(null)
  }, [])

  return {
    isHighContrast,
    systemPreference,
    hasOverride: override !== null,
    toggle,
    setHighContrast,
    resetToSystem,
  }
}

// ──────────────────────────────────────────────────────────────
// HighContrastProvider — Context provider
// ──────────────────────────────────────────────────────────────

const HighContrastContext = React.createContext<UseHighContrastReturn>({
  isHighContrast: false,
  systemPreference: null,
  hasOverride: false,
  toggle: () => {},
  setHighContrast: () => {},
  resetToSystem: () => {},
})

interface HighContrastProviderProps {
  children: React.ReactNode
}

function HighContrastProvider({ children }: HighContrastProviderProps) {
  const value = useHighContrast()
  return (
    <HighContrastContext.Provider value={value}>
      {children}
    </HighContrastContext.Provider>
  )
}

// ──────────────────────────────────────────────────────────────
// HighContrastToggle — Toggle button component
// ──────────────────────────────────────────────────────────────

interface HighContrastToggleProps {
  className?: string
  /** Label for the toggle button */
  label?: string
  /** Show reset to system option */
  showReset?: boolean
}

/**
 * Toggle button for high contrast mode.
 *
 * @example
 * ```tsx
 * <HighContrastToggle />
 * ```
 */
function HighContrastToggle({
  className,
  label = 'High contrast mode',
  showReset = true,
}: HighContrastToggleProps) {
  const { isHighContrast, toggle, hasOverride, resetToSystem } =
    React.useContext(HighContrastContext)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={isHighContrast}
        aria-label={label}
        onClick={toggle}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden',
          isHighContrast
            ? 'bg-primary'
            : 'bg-muted'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
            isHighContrast ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      <span className="text-sm">{label}</span>
      {showReset && hasOverride && (
        <button
          type="button"
          onClick={resetToSystem}
          className="text-xs text-muted-foreground underline hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden rounded-sm"
        >
          Reset to system
        </button>
      )}
    </div>
  )
}

export {
  HighContrastProvider,
  HighContrastToggle,
  HighContrastContext,
  useHighContrast,
}
export type { UseHighContrastReturn }
