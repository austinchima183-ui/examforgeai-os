'use client'

// ============================================================================
// ExamForge AI — Focus Trap Component
// ============================================================================
// Traps focus within a container (dialogs, modals, drawers).
// Returns focus to the trigger element when unmounted.
// WCAG 2.2 AA: 2.4.3 Focus Order, 2.1.2 No Keyboard Trap
// ============================================================================

import { useEffect, useRef, useCallback, type RefObject } from 'react'

// ──────────────────────────────────────────────────────────────
// Focusable Element Selectors
// ──────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled]):not([aria-hidden="true"])',
  'input:not([disabled]):not([aria-hidden="true"])',
  'select:not([disabled]):not([aria-hidden="true"])',
  'textarea:not([disabled]):not([aria-hidden="true"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])',
  '[contenteditable="true"]',
  'details > summary',
].join(', ')

// ──────────────────────────────────────────────────────────────
// Utility: Get all focusable elements within a container
// ──────────────────────────────────────────────────────────────

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  )
  // Filter to only visible elements
  return elements.filter((el) => {
    const style = window.getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
  })
}

// ──────────────────────────────────────────────────────────────
// FocusTrap Component
// ──────────────────────────────────────────────────────────────

interface FocusTrapProps {
  /** Whether the focus trap is active */
  active: boolean
  /** Element to return focus to when trap deactivates */
  restoreFocusTo?: RefObject<HTMLElement | null>
  /** Whether to auto-focus the first element when trap activates */
  autoFocus?: boolean
  /** Whether to prevent scroll on auto-focus */
  preventScroll?: boolean
  children: React.ReactNode
}

/**
 * Focus trap wrapper for dialogs, modals, and drawers.
 *
 * When `active` is true:
 * - Tab and Shift+Tab cycle through focusable elements within the container
 * - Focus cannot leave the container via keyboard
 * - Optionally auto-focuses the first focusable element
 *
 * When `active` becomes false:
 * - Focus is returned to the `restoreFocusTo` element (or the previously focused element)
 * - Normal tab order resumes
 *
 * @example
 * ```tsx
 * const triggerRef = useRef<HTMLButtonElement>(null)
 * const [open, setOpen] = useState(false)
 *
 * return (
 *   <>
 *     <button ref={triggerRef} onClick={() => setOpen(true)}>Open</button>
 *     {open && (
 *       <FocusTrap active={open} restoreFocusTo={triggerRef}>
 *         <div role="dialog" aria-modal="true">
 *           <h2>Dialog content</h2>
 *           <button onClick={() => setOpen(false)}>Close</button>
 *         </div>
 *       </FocusTrap>
 *     )}
 *   </>
 * )
 * ```
 */
function FocusTrap({
  active,
  restoreFocusTo,
  autoFocus = true,
  preventScroll = true,
  children,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Save the currently focused element when trap activates
  useEffect(() => {
    if (active) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement
    }
  }, [active])

  // Handle keyboard navigation within the trap
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!active || event.key !== 'Tab') return

      const container = containerRef.current
      if (!container) return

      const focusableElements = getFocusableElements(container)
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    },
    [active]
  )

  // Auto-focus first element when trap activates
  useEffect(() => {
    if (!active || !autoFocus) return

    const container = containerRef.current
    if (!container) return

    // Small delay to allow DOM to settle
    const timerId = setTimeout(() => {
      const focusableElements = getFocusableElements(container)
      if (focusableElements.length > 0) {
        focusableElements[0].focus({ preventScroll })
      }
    }, 50)

    return () => clearTimeout(timerId)
  }, [active, autoFocus, preventScroll])

  // Return focus when trap deactivates
  useEffect(() => {
    if (active) return

    const restoreTarget = restoreFocusTo?.current ?? previouslyFocusedRef.current
    if (restoreTarget && typeof restoreTarget.focus === 'function') {
      // Small delay to allow the trap container to unmount
      const timerId = setTimeout(() => {
        restoreTarget.focus()
      }, 50)
      return () => clearTimeout(timerId)
    }
  }, [active, restoreFocusTo])

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      style={active ? undefined : undefined}
    >
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// useFocusTrap Hook (standalone, no component wrapper needed)
// ──────────────────────────────────────────────────────────────

interface UseFocusTrapOptions {
  /** Whether the trap is active */
  active: boolean
  /** Element to return focus to on deactivate */
  restoreFocusTo?: RefObject<HTMLElement | null>
  /** Auto-focus first element on activate */
  autoFocus?: boolean
}

/**
 * Standalone focus trap hook — use when you can't wrap with the component.
 *
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null)
 * useFocusTrap({ ref: containerRef, active: isOpen })
 *
 * return <div ref={containerRef}>...</div>
 * ```
 */
function useFocusTrap({
  ref,
  active,
  restoreFocusTo,
  autoFocus = true,
}: UseFocusTrapOptions & { ref: RefObject<HTMLElement | null> }) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Save previously focused element
  useEffect(() => {
    if (active) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement
    }
  }, [active])

  // Keyboard handler
  useEffect(() => {
    if (!active) return

    const container = ref.current
    if (!container) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(container)
      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    // Auto-focus
    if (autoFocus) {
      const timerId = setTimeout(() => {
        const focusableElements = getFocusableElements(container)
        if (focusableElements.length > 0) {
          focusableElements[0].focus({ preventScroll: true })
        }
      }, 50)

      return () => {
        container.removeEventListener('keydown', handleKeyDown)
        clearTimeout(timerId)
      }
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, active, autoFocus])

  // Restore focus on deactivate
  useEffect(() => {
    if (active) return

    const restoreTarget = restoreFocusTo?.current ?? previouslyFocusedRef.current
    if (restoreTarget && typeof restoreTarget.focus === 'function') {
      const timerId = setTimeout(() => {
        restoreTarget.focus()
      }, 50)
      return () => clearTimeout(timerId)
    }
  }, [active, restoreFocusTo])
}

export { FocusTrap, useFocusTrap, getFocusableElements }
