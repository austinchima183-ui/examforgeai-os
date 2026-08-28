'use client'

// ============================================================================
// ExamForge AI — Skip Navigation Component
// ============================================================================
// Skip-to-content link that appears on focus — the first focusable element
// on the page. Essential for keyboard users to bypass repetitive navigation.
// WCAG 2.2 AA: 2.4.1 Bypass Blocks, 2.4.7 Focus Visible
// ============================================================================

import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface SkipNavLinkProps {
  /** ID of the main content area to skip to (default: "main-content") */
  contentId?: string
  /** Label text for the skip link (default: "Skip to main content") */
  label?: string
  /** Additional CSS classes */
  className?: string
}

// ──────────────────────────────────────────────────────────────
// Default Content ID
// ──────────────────────────────────────────────────────────────

/**
 * Default ID that SkipNavLink targets and SkipNavContent renders.
 * Must be consistent between the link and the content target.
 */
export const SKIP_NAV_CONTENT_ID = 'main-content'

// ──────────────────────────────────────────────────────────────
// SkipNavLink
// ──────────────────────────────────────────────────────────────

/**
 * Skip navigation link — must be the first focusable element in the DOM.
 *
 * Renders as a visually hidden link that becomes visible on keyboard focus.
 * When activated, moves focus to the main content area, bypassing
 * repetitive navigation blocks (sidebar, header, etc.).
 *
 * @example
 * ```tsx
 * // Place at the very top of your layout, before any navigation
 * <SkipNavLink />
 * <header>...</header>
 * <main id="main-content">...</main>
 * ```
 */
function SkipNavLink({
  contentId = SKIP_NAV_CONTENT_ID,
  label = 'Skip to main content',
  className,
}: SkipNavLinkProps) {
  return (
    <a
      href={`#${contentId}`}
      // Visible on focus only: off-screen by default, slides in on focus
      className={cn(
        'fixed top-0 left-0 z-[9999] -translate-y-full',
        'focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'bg-[#2563EB] text-white px-4 py-2 text-sm font-medium',
        'transition-transform duration-150',
        className
      )}
      // Ensure screen readers always see it
      aria-label={label}
    >
      {label}
    </a>
  )
}

// ──────────────────────────────────────────────────────────────
// SkipNavContent
// ──────────────────────────────────────────────────────────────

interface SkipNavContentProps {
  /** ID for the content area (default: "main-content") */
  id?: string
  /** Additional CSS classes */
  className?: string
  children: React.ReactNode
}

/**
 * Target container for the skip navigation link.
 *
 * Renders a div with the appropriate ID and tabindex so that
 * focus can be programmatically moved to this element.
 *
 * @example
 * ```tsx
 * <SkipNavContent>
 *   <h1>Main page content</h1>
 *   {/* ... *\/}
 * </SkipNavContent>
 * ```
 */
function SkipNavContent({
  id = SKIP_NAV_CONTENT_ID,
  className,
  children,
}: SkipNavContentProps) {
  return (
    <div
      id={id}
      tabIndex={-1}
      className={cn('outline-none', className)}
    >
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// SkipToSection — Secondary skip links
// ──────────────────────────────────────────────────────────────

interface SkipToSectionProps {
  /** Target section ID */
  targetId: string
  /** Label for the skip link */
  label: string
  className?: string
}

/**
 * Additional skip link for secondary content areas.
 * Use for skipping to search, to complementary content, etc.
 *
 * @example
 * ```tsx
 * <SkipToSection targetId="search-results" label="Skip to search results" />
 * ```
 */
function SkipToSection({
  targetId,
  label,
  className,
}: SkipToSectionProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'fixed top-0 left-0 z-[9998] -translate-y-full',
        'focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'bg-[#2563EB] text-white px-4 py-2 text-sm font-medium',
        'transition-transform duration-150',
        'ml-[180px]', // Offset so it doesn't overlap primary skip link
        className
      )}
      aria-label={label}
    >
      {label}
    </a>
  )
}

export { SkipNavLink, SkipNavContent, SkipToSection }
