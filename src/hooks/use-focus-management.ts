'use client'

// ============================================================================
// ExamForge AI — Focus Management Hooks
// ============================================================================
// Comprehensive focus management utilities for accessible keyboard navigation.
// - useFocusTrap: Trap focus within a container
// - useReturnFocus: Return focus to a previous element
// - useRovingTabIndex: Arrow key navigation for composite widgets
// WCAG 2.2 AA: 2.4.3 Focus Order, 2.1.1 Keyboard, 2.1.2 No Keyboard Trap
// ============================================================================

import { useEffect, useRef, useCallback, useState, type RefObject } from 'react'

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

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  )
  return elements.filter((el) => {
    const style = window.getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
  })
}

// ──────────────────────────────────────────────────────────────
// useFocusTrap
// ──────────────────────────────────────────────────────────────

interface UseFocusTrapOptions {
  /** Whether the focus trap is active */
  active: boolean
  /** Element to return focus to when trap deactivates */
  restoreFocusTo?: RefObject<HTMLElement | null>
  /** Auto-focus first element when trap activates */
  autoFocus?: boolean
  /** Prevent scroll on auto-focus */
  preventScroll?: boolean
  /** Escape key handler (usually closes the dialog) */
  onEscape?: () => void
}

/**
 * Trap keyboard focus within a container element.
 *
 * When active:
 * - Tab/Shift+Tab cycles through focusable children
 * - Focus cannot escape the container
 * - Escape key triggers optional callback
 * - First focusable element receives focus automatically
 *
 * When deactivated:
 * - Focus returns to `restoreFocusTo` or previously focused element
 *
 * @example
 * ```tsx
 * const dialogRef = useRef<HTMLDivElement>(null)
 * const [open, setOpen] = useState(false)
 *
 * useFocusTrap({
 *   ref: dialogRef,
 *   active: open,
 *   onEscape: () => setOpen(false),
 * })
 *
 * return open ? (
 *   <div ref={dialogRef} role="dialog" aria-modal="true">...</div>
 * ) : null
 * ```
 */
export function useFocusTrap({
  ref,
  active,
  restoreFocusTo,
  autoFocus = true,
  preventScroll = true,
  onEscape,
}: UseFocusTrapOptions & { ref: RefObject<HTMLElement | null> }) {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  // Save the currently focused element when trap activates
  useEffect(() => {
    if (active) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement
    }
  }, [active])

  // Set up the trap
  useEffect(() => {
    if (!active) return

    const container = ref.current
    if (!container) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault()
        onEscape()
        return
      }

      // Handle Tab key for focus trapping
      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements(container)
      if (focusableElements.length === 0) {
        event.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        // Shift+Tab: wrap from first to last
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: wrap from last to first
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    // Auto-focus the first focusable element
    if (autoFocus) {
      const timerId = setTimeout(() => {
        const focusableElements = getFocusableElements(container)
        if (focusableElements.length > 0) {
          focusableElements[0].focus({ preventScroll })
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
  }, [ref, active, autoFocus, preventScroll, onEscape])

  // Restore focus when trap deactivates
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

// ──────────────────────────────────────────────────────────────
// useReturnFocus
// ──────────────────────────────────────────────────────────────

interface UseReturnFocusOptions {
  /** Whether to return focus (trigger on change from true to false) */
  active: boolean
  /** Specific element to return focus to */
  target?: RefObject<HTMLElement | null>
}

/**
 * Return focus to a previous element when a condition becomes false.
 *
 * Useful for modal/dialog patterns where focus should return to the
 * trigger button after the overlay closes.
 *
 * @example
 * ```tsx
 * const triggerRef = useRef<HTMLButtonElement>(null)
 * const [open, setOpen] = useState(false)
 *
 * useReturnFocus({ active: open, target: triggerRef })
 *
 * return (
 *   <button ref={triggerRef} onClick={() => setOpen(true)}>Open</button>
 * )
 * ```
 */
export function useReturnFocus({ active, target }: UseReturnFocusOptions) {
  const savedFocusRef = useRef<HTMLElement | null>(null)

  // Save current focus when activated
  useEffect(() => {
    if (active) {
      savedFocusRef.current = document.activeElement as HTMLElement
    }
  }, [active])

  // Restore focus when deactivated
  useEffect(() => {
    if (active) return

    const focusTarget = target?.current ?? savedFocusRef.current
    if (focusTarget && typeof focusTarget.focus === 'function') {
      const timerId = setTimeout(() => {
        focusTarget.focus()
      }, 50)
      return () => clearTimeout(timerId)
    }
  }, [active, target])
}

// ──────────────────────────────────────────────────────────────
// useRovingTabIndex
// ──────────────────────────────────────────────────────────────

type RovingDirection = 'horizontal' | 'vertical' | 'both'

interface UseRovingTabIndexOptions {
  /** Direction of arrow key navigation */
  direction?: RovingDirection
  /** Whether the roving index is enabled */
  enabled?: boolean
  /** Initial focused index */
  initialIndex?: number
  /** Whether to wrap around at the ends */
  wrap?: boolean
  /** Callback when the focused index changes */
  onFocusChange?: (_index: number) => void
}

interface UseRovingTabIndexReturn {
  /** Currently focused index */
  activeIndex: number
  /** Set the active index manually */
  setActiveIndex: (_index: number) => void
  /** Props to spread onto the container element */
  containerProps: {
    onKeyDown: (_event: React.KeyboardEvent) => void
    role: string
    'aria-activedescendant'?: string
  }
  /** Get props for a specific item by index */
  getItemProps: (_index: number, _id?: string) => {
    tabIndex: number
    id?: string
    'aria-selected'?: boolean
    onFocus: () => void
  }
}

/**
 * Roving tabindex pattern for composite widgets.
 *
 * Implements the WAI-ARIA roving tabindex pattern where only one item
 * in a group is in the tab order (tabIndex=0), and arrow keys move
 * focus between items.
 *
 * @example
 * ```tsx
 * function MenuList({ items }: { items: string[] }) {
 *   const { activeIndex, containerProps, getItemProps } = useRovingTabIndex({
 *     direction: 'vertical',
 *   })
 *
 *   return (
 *     <ul {...containerProps} role="menu">
 *       {items.map((item, i) => (
 *         <li key={item} role="menuitem" {...getItemProps(i)}>
 *           {item}
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useRovingTabIndex({
  direction = 'vertical',
  enabled = true,
  initialIndex = 0,
  wrap = true,
  onFocusChange,
}: UseRovingTabIndexOptions = {}): UseRovingTabIndexReturn {
  const [activeIndex, setActiveIndexInternal] = useState(initialIndex)
  const itemCountRef = useRef(0)

  const setActiveIndex = useCallback(
    (index: number) => {
      setActiveIndexInternal(index)
      onFocusChange?.(index)
    },
    [onFocusChange]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled) return

      const itemCount = itemCountRef.current
      if (itemCount === 0) return

      let newIndex = activeIndex

      switch (event.key) {
        case 'ArrowDown':
          if (direction === 'vertical' || direction === 'both') {
            event.preventDefault()
            newIndex = activeIndex + 1
            if (newIndex >= itemCount) {
              newIndex = wrap ? 0 : itemCount - 1
            }
          }
          break

        case 'ArrowUp':
          if (direction === 'vertical' || direction === 'both') {
            event.preventDefault()
            newIndex = activeIndex - 1
            if (newIndex < 0) {
              newIndex = wrap ? itemCount - 1 : 0
            }
          }
          break

        case 'ArrowRight':
          if (direction === 'horizontal' || direction === 'both') {
            event.preventDefault()
            newIndex = activeIndex + 1
            if (newIndex >= itemCount) {
              newIndex = wrap ? 0 : itemCount - 1
            }
          }
          break

        case 'ArrowLeft':
          if (direction === 'horizontal' || direction === 'both') {
            event.preventDefault()
            newIndex = activeIndex - 1
            if (newIndex < 0) {
              newIndex = wrap ? itemCount - 1 : 0
            }
          }
          break

        case 'Home':
          event.preventDefault()
          newIndex = 0
          break

        case 'End':
          event.preventDefault()
          newIndex = itemCount - 1
          break

        default:
          return
      }

      if (newIndex !== activeIndex) {
        setActiveIndex(newIndex)
        // Move DOM focus to the new item
        const container = event.currentTarget
        const items = container.querySelectorAll<HTMLElement>(
          '[role="option"], [role="menuitem"], [role="tab"], [role="treeitem"], [data-roving-item]'
        )
        const targetItem = items[newIndex]
        if (targetItem) {
          targetItem.focus()
        }
      }
    },
    [enabled, direction, activeIndex, wrap, setActiveIndex]
  )

  const getItemProps = useCallback(
    (index: number, id?: string) => {
      // Track item count
      itemCountRef.current = Math.max(itemCountRef.current, index + 1)

      const isActive = index === activeIndex

      return {
        tabIndex: isActive ? 0 : -1,
        ...(id ? { id } : {}),
        ...(isActive ? { 'aria-selected': true as const } : {}),
        onFocus: () => setActiveIndex(index),
        'data-roving-item': '',
      }
    },
    [activeIndex, setActiveIndex]
  )

  return {
    activeIndex,
    setActiveIndex,
    containerProps: {
      onKeyDown: handleKeyDown,
      role: 'listbox',
    },
    getItemProps,
  }
}
