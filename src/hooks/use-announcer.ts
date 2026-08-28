'use client'

// ============================================================================
// ExamForge AI — Live Region Announcer Hook
// ============================================================================
// Provides a centralized API for announcing messages to screen readers
// via ARIA live regions. Supports polite, assertive, status, and error
// announcement modes.
// WCAG 2.2 AA: 4.1.3 Status Messages
// ============================================================================

import { useRef, useCallback, useEffect } from 'react'

// ──────────────────────────────────────────────────────────────
// Live Region Types
// ──────────────────────────────────────────────────────────────

type AriaLiveMode = 'polite' | 'assertive' | 'status' | 'error'

interface AnnouncerRegion {
  element: HTMLDivElement
  mode: AriaLiveMode
}

// ──────────────────────────────────────────────────────────────
// Singleton Manager — ensures one set of live regions per page
// ──────────────────────────────────────────────────────────────

let regions: Map<AriaLiveMode, AnnouncerRegion> | null = null
let regionRefCount = 0

function getOrCreateRegions(): Map<AriaLiveMode, AnnouncerRegion> {
  if (regions) return regions

  regions = new Map()

  const modes: AriaLiveMode[] = ['polite', 'assertive', 'status', 'error']

  for (const mode of modes) {
    const element = document.createElement('div')
    element.setAttribute('role', mode === 'error' ? 'alert' : mode === 'status' ? 'status' : 'log')
    element.setAttribute('aria-live', mode === 'error' ? 'assertive' : mode === 'status' ? 'polite' : mode)
    element.setAttribute('aria-atomic', 'true')
    element.className = 'sr-only'

    // Unique ID for debugging
    element.id = `examforge-announcer-${mode}`
    element.dataset.announcerMode = mode

    document.body.appendChild(element)
    regions.set(mode, { element, mode })
  }

  return regions
}

function cleanupRegions() {
  if (!regions) return
  for (const [, region] of regions) {
    region.element.remove()
  }
  regions = null
}

// ──────────────────────────────────────────────────────────────
// Internal announce function
// ──────────────────────────────────────────────────────────────

function announceToRegion(mode: AriaLiveMode, message: string) {
  const allRegions = getOrCreateRegions()
  const region = allRegions.get(mode)
  if (!region) return

  // Clear and re-set to ensure screen readers announce the change.
  // Some screen readers won't re-announce if the text is identical.
  region.element.textContent = ''

  // Use requestAnimationFrame to ensure the DOM update is flushed
  // before setting the new message
  requestAnimationFrame(() => {
    region.element.textContent = message
  })
}

// ──────────────────────────────────────────────────────────────
// useAnnouncer Hook
// ──────────────────────────────────────────────────────────────

interface UseAnnouncerOptions {
  /** Whether the announcer is enabled (default: true) */
  enabled?: boolean
  /** Debounce delay in ms for rapid announcements (default: 150) */
  debounceMs?: number
}

interface UseAnnouncerReturn {
  /** Announce a message politely (waits for current speech to finish) */
  announcePolite: (_message: string) => void
  /** Announce a message assertively (interrupts current speech) */
  assertive: (_message: string) => void
  /** Announce a status change (uses role="status", aria-live="polite") */
  announceStatus: (_message: string) => void
  /** Announce an error (uses role="alert", aria-live="assertive") */
  announceError: (_message: string) => void
  /** Clear all live regions */
  clearAll: () => void
}

/**
 * Live region announcer hook for screen reader accessibility.
 *
 * Creates and manages visually hidden ARIA live regions for announcing
 * dynamic content changes to assistive technology.
 *
 * - `announcePolite` — aria-live="polite": waits for current speech
 * - `assertive` — aria-live="assertive": interrupts current speech
 * - `announceStatus` — role="status": for status bar messages
 * - `announceError` — role="alert": for error messages (urgent)
 *
 * @example
 * ```tsx
 * function ExamSubmission() {
 *   const { announcePolite, announceError, announceStatus } = useAnnouncer()
 *
 *   const handleSubmit = async () => {
 *     announcePolite('Submitting exam...')
 *     try {
 *       await submitExam()
 *       announceStatus('Exam submitted successfully')
 *     } catch {
 *       announceError('Failed to submit exam. Please try again.')
 *     }
 *   }
 * }
 * ```
 */
function useAnnouncer(options: UseAnnouncerOptions = {}): UseAnnouncerReturn {
  const { enabled = true, debounceMs = 150 } = options
  const debounceTimers = useRef<Map<AriaLiveMode, ReturnType<typeof setTimeout>>>(new Map())

  // Register / unregister reference counting
  useEffect(() => {
    const timers = debounceTimers.current
    regionRefCount++
    return () => {
      regionRefCount--
      // Clean up timers
      for (const [, timer] of timers) {
        clearTimeout(timer)
      }
      timers.clear()
      // Only clean up DOM regions when no hook instances remain
      if (regionRefCount === 0) {
        cleanupRegions()
      }
    }
  }, [])

  const debouncedAnnounce = useCallback(
    (mode: AriaLiveMode, message: string) => {
      if (!enabled) return

      // Clear any pending announcement for this mode
      const existingTimer = debounceTimers.current.get(mode)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      const timer = setTimeout(() => {
        announceToRegion(mode, message)
        debounceTimers.current.delete(mode)
      }, debounceMs)

      debounceTimers.current.set(mode, timer)
    },
    [enabled, debounceMs]
  )

  const announcePolite = useCallback(
    (message: string) => debouncedAnnounce('polite', message),
    [debouncedAnnounce]
  )

  const assertive = useCallback(
    (message: string) => {
      // Assertive announcements skip debouncing by default
      if (!enabled) return
      announceToRegion('assertive', message)
    },
    [enabled]
  )

  const announceStatus = useCallback(
    (message: string) => debouncedAnnounce('status', message),
    [debouncedAnnounce]
  )

  const announceError = useCallback(
    (message: string) => {
      // Error announcements skip debouncing — they are urgent
      if (!enabled) return
      announceToRegion('error', message)
    },
    [enabled]
  )

  const clearAll = useCallback(() => {
    if (!regions) return
    for (const [, region] of regions) {
      region.element.textContent = ''
    }
  }, [])

  return {
    announcePolite,
    assertive,
    announceStatus,
    announceError,
    clearAll,
  }
}

export { useAnnouncer }
export type { UseAnnouncerReturn, UseAnnouncerOptions }
