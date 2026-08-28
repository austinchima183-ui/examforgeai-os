'use client'

// ============================================================================
// ExamForge AI — Reduced Motion Hook
// ============================================================================
// Detects the user's prefers-reduced-motion media query setting.
// Disables or reduces animations for users who prefer reduced motion.
// WCAG 2.2 AA: 2.3.3 Animation from Interactions
// ============================================================================

import { useSyncExternalStore } from 'react'

// ──────────────────────────────────────────────────────────────
// useReducedMotion
// ──────────────────────────────────────────────────────────────

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getServerSnapshot(): boolean {
  return false
}

function subscribe(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {}
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  mediaQuery.addEventListener('change', onStoreChange)
  return () => {
    mediaQuery.removeEventListener('change', onStoreChange)
  }
}

/**
 * Detects whether the user prefers reduced motion.
 *
 * Returns `true` if the user has enabled "Reduce motion" in their
 * OS accessibility settings, `false` otherwise.
 *
 * Uses `useSyncExternalStore` for optimal SSR and hydration safety.
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const prefersReducedMotion = useReducedMotion()
 *
 *   return (
 *     <motion.div
 *       initial={{ opacity: 0 }}
 *       animate={{ opacity: 1 }}
 *       transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
 *     >
 *       Content
 *     </motion.div>
 *   )
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// ──────────────────────────────────────────────────────────────
// useMotionConfig
// ──────────────────────────────────────────────────────────────

interface MotionConfig {
  /** Animation duration (0 when reduced motion is preferred) */
  duration: number
  /** Whether to use spring physics (false when reduced motion) */
  useSpring: boolean
  /** Delay before animation starts (0 when reduced motion) */
  delay: number
}

/**
 * Returns animation configuration that respects reduced motion preference.
 *
 * When the user prefers reduced motion:
 * - All durations become 0
 * - Spring animations are disabled
 * - All delays become 0
 *
 * @example
 * ```tsx
 * function FadeIn({ children }: { children: React.ReactNode }) {
 *   const { duration } = useMotionConfig({ defaultDuration: 0.3 })
 *
 *   return (
 *     <motion.div
 *       initial={{ opacity: 0, y: 10 }}
 *       animate={{ opacity: 1, y: 0 }}
 *       transition={{ duration }}
 *     >
 *       {children}
 *     </motion.div>
 *   )
 * }
 * ```
 */
export function useMotionConfig(options?: {
  /** Default animation duration in seconds (default: 0.3) */
  defaultDuration?: number
  /** Whether to use spring by default (default: true) */
  defaultUseSpring?: boolean
  /** Default delay in seconds (default: 0) */
  defaultDelay?: number
}): MotionConfig {
  const prefersReducedMotion = useReducedMotion()
  const defaultDuration = options?.defaultDuration ?? 0.3
  const defaultUseSpring = options?.defaultUseSpring ?? true
  const defaultDelay = options?.defaultDelay ?? 0

  if (prefersReducedMotion) {
    return {
      duration: 0,
      useSpring: false,
      delay: 0,
    }
  }

  return {
    duration: defaultDuration,
    useSpring: defaultUseSpring,
    delay: defaultDelay,
  }
}

// ──────────────────────────────────────────────────────────────
// useAnimationProps
// ──────────────────────────────────────────────────────────────

interface AnimationProps {
  /** CSS transition duration string */
  transitionDuration: string
  /** CSS animation duration string */
  animationDuration: string
  /** Whether animations are enabled */
  animate: boolean
  /** Framer Motion transition config */
  motionTransition: {
    duration: number
    ease?: string
  }
}

/**
 * Returns CSS and Framer Motion animation props respecting reduced motion.
 *
 * @example
 * ```tsx
 * function Card() {
 *   const { transitionDuration, animate } = useAnimationProps(0.2)
 *
 *   return (
 *     <div
 *       style={{ transition: animate ? `all ${transitionDuration} ease` : 'none' }}
 *       className="hover:scale-105"
 *     >
 *       Card content
 *     </div>
 *   )
 * }
 * ```
 */
export function useAnimationProps(defaultDurationSeconds: number = 0.2): AnimationProps {
  const prefersReducedMotion = useReducedMotion()

  const duration = prefersReducedMotion ? 0 : defaultDurationSeconds
  const durationMs = Math.round(duration * 1000)

  return {
    transitionDuration: `${durationMs}ms`,
    animationDuration: `${durationMs}ms`,
    animate: !prefersReducedMotion,
    motionTransition: {
      duration,
      ...(duration > 0 ? { ease: 'easeOut' } : {}),
    },
  }
}

// ──────────────────────────────────────────────────────────────
// getReducedMotionTransition — Utility for Framer Motion variants
// ──────────────────────────────────────────────────────────────

/**
 * Returns a Framer Motion transition that is either normal or instant
 * based on the reduced motion preference.
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion()
 *
 * <motion.div
 *   initial={{ opacity: 0 }}
 *   animate={{ opacity: 1 }}
 *   transition={getReducedMotionTransition(prefersReducedMotion)}
 * />
 * ```
 */
export function getReducedMotionTransition(
  prefersReducedMotion: boolean,
  normalTransition: Record<string, unknown> = { duration: 0.3, ease: 'easeOut' }
): Record<string, unknown> {
  if (prefersReducedMotion) {
    return { duration: 0 }
  }
  return normalTransition
}
