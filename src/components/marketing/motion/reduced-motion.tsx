'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { motion, MotionConfig, useReducedMotion } from 'framer-motion'

// ============================================================================
// ExamForge AI — Reduced Motion Support
// ============================================================================
// Wraps the entire marketing site with proper reduced motion handling.
// When the user has prefers-reduced-motion enabled:
//   - All animations are instant (duration: 0)
//   - Transitions are instant
//   - Complex animations (particles, mesh) are hidden
//   - Essential state changes still work (modal open/close)
//
// This ensures WCAG 2.1 Level AA compliance for motion-sensitive users.
// ============================================================================

export function MotionProvider({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <MotionConfig
      // When reduced motion is preferred, all animations become instant
      transition={shouldReduceMotion ? { duration: 0 } : undefined}
    >
      {children}
    </MotionConfig>
  )
}

// ============================================================================
// useReducedMotion Hook — Re-exported for component use
// ============================================================================
// Components should check this before rendering expensive animations
// like particles, mesh backgrounds, and continuous animations.
// ============================================================================

export { useReducedMotion }

// ============================================================================
// Conditional Animation Wrapper
// ============================================================================
// Renders animation only when motion is not reduced.
// Use for non-essential animations: particles, floating elements, mesh.
// ============================================================================

interface ConditionalMotionProps {
  children: ReactNode
  /** Fallback content when motion is reduced */
  fallback?: ReactNode
}

export function ConditionalMotion({ children, fallback = null }: ConditionalMotionProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// ============================================================================
// Reduced Motion CSS — Injected at mount time
// ============================================================================
// Adds a global CSS rule that overrides animation-duration for
// users who prefer reduced motion. This catches CSS animations
// that framer-motion doesn't control (e.g., marquee, float).
// ============================================================================

export function ReducedMotionStyles() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)

    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (!reduced) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        `,
      }}
    />
  )
}
