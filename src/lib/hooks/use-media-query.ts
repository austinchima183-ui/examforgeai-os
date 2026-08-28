// ============================================================================
// ExamForge AI — Media Query Hook
// ============================================================================
// Responsive breakpoint detection hook using the matchMedia API.
// Supports both custom media queries and predefined Tailwind breakpoints.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'

// ──────────────────────────────────────────────────────────────
// Tailwind Breakpoints (matching tailwind.config.ts)
// ──────────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof BREAKPOINTS

/**
 * Check if a media query matches the current viewport.
 *
 * @param query - A CSS media query string
 * @returns Whether the media query currently matches
 *
 * @example
 * ```tsx
 * const isSmallScreen = useMediaQuery('(max-width: 640px)')
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)

    // Create event listener
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Subscribe to changes
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [query])

  return matches
}

/**
 * Check if the viewport is at or above a specific Tailwind breakpoint.
 *
 * @param breakpoint - A Tailwind breakpoint name (sm, md, lg, xl, 2xl)
 * @returns Whether the viewport width is at or above the breakpoint
 *
 * @example
 * ```tsx
 * const isDesktop = useBreakpoint('lg')
 * const isTablet = useBreakpoint('md')
 * ```
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const query = `(min-width: ${BREAKPOINTS[breakpoint]}px)`
  return useMediaQuery(query)
}

/**
 * Check if the viewport is between two breakpoints.
 *
 * @param min - Minimum breakpoint (inclusive)
 * @param max - Maximum breakpoint (exclusive)
 * @returns Whether the viewport is between the two breakpoints
 *
 * @example
 * ```tsx
 * const isTabletOnly = useBreakpointBetween('md', 'lg')
 * ```
 */
export function useBreakpointBetween(min: Breakpoint, max: Breakpoint): boolean {
  const query = `(min-width: ${BREAKPOINTS[min]}px) and (max-width: ${BREAKPOINTS[max] - 1}px)`
  return useMediaQuery(query)
}

/**
 * Get the current active breakpoint name.
 *
 * @returns The name of the largest matching breakpoint
 *
 * @example
 * ```tsx
 * const current = useCurrentBreakpoint() // → 'lg'
 * ```
 */
export function useCurrentBreakpoint(): Breakpoint | 'xs' {
  const computeBreakpoint = useCallback((): Breakpoint | 'xs' => {
    if (typeof window === 'undefined') return 'xs'

    const width = window.innerWidth
    const breakpoints: Array<[Breakpoint, number]> = Object.entries(BREAKPOINTS) as Array<[Breakpoint, number]>

    for (let i = breakpoints.length - 1; i >= 0; i--) {
      if (width >= breakpoints[i][1]) {
        return breakpoints[i][0]
      }
    }

    return 'xs'
  }, [])

  const [breakpoint, setBreakpoint] = useState<Breakpoint | 'xs'>(() => {
    return computeBreakpoint()
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setBreakpoint(computeBreakpoint())
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [computeBreakpoint])

  return breakpoint
}
