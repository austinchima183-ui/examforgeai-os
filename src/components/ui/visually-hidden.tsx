'use client'

// ============================================================================
// ExamForge AI — VisuallyHidden Component
// ============================================================================
// Content visible to screen readers only, using Radix UI's VisuallyHidden
// primitive. Ensures accessible content without visual rendering.
// WCAG 2.2 AA: 1.3.1 Info and Relationships
// ============================================================================

import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden'

// ──────────────────────────────────────────────────────────────
// VisuallyHidden
// ──────────────────────────────────────────────────────────────

interface VisuallyHiddenProps {
  children: React.ReactNode
  asChild?: boolean
}

/**
 * Renders content that is visually hidden but accessible to screen readers.
 *
 * Use cases:
 * - Provide additional context for screen reader users
 * - Label interactive elements without visible text
 * - Announce dynamic content changes
 * - Add accessible names to icon-only buttons
 *
 * @example
 * ```tsx
 * <button>
 *   <TrashIcon />
 *   <VisuallyHidden>Delete item</VisuallyHidden>
 * </button>
 * ```
 */
function VisuallyHidden({ children, asChild }: VisuallyHiddenProps) {
  return (
    <VisuallyHiddenPrimitive.Root asChild={asChild}>
      {children}
    </VisuallyHiddenPrimitive.Root>
  )
}

export { VisuallyHidden }
