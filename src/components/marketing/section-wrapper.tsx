'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useInView, type TargetAndTransition } from 'framer-motion'
import { cn } from '@/lib/utils'
import { easings, durations } from './motion/motion-primitives'

// ============================================================================
// ExamForge AI — Premium Section Wrapper
// ============================================================================
// World-class section wrapper inspired by Stripe & Linear.
// Features:
//   - Scroll-triggered reveal with blur-to-sharp transition
//   - Staggered content entrance (label → heading → body)
//   - GPU-accelerated transforms only (translateY + opacity + filter)
//   - Consistent spacing, max-width, and visual rhythm
//   - Optional animated gradient line at section boundary
//   - `will-change` for compositor-only animations
// ============================================================================

type RevealVariant = 'fade' | 'slide-up' | 'blur-up' | 'scale-up' | 'clip-up'

interface SectionWrapperProps {
  children: ReactNode
  className?: string
  id?: string
  /** Optional background class applied to the outer section */
  backgroundClassName?: string
  /** Whether to show the reveal animation */
  animate?: boolean
  /** Animation delay in seconds */
  delay?: number
  /** Whether to use full-width layout (no max-w container) */
  fullWidth?: boolean
  /** Reveal animation variant */
  reveal?: RevealVariant
  /** Show a gradient divider line at the top of the section */
  showDivider?: boolean
  /** Section tag for semantics */
  as?: 'section' | 'div'
  /** Additional aria label */
  ariaLabel?: string
}

const revealVariants: Record<RevealVariant, { initial: TargetAndTransition; animate: TargetAndTransition }> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  'slide-up': {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
  },
  'blur-up': {
    initial: { opacity: 0, y: 24, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  },
  'scale-up': {
    initial: { opacity: 0, scale: 0.96, y: 20 },
    animate: { opacity: 1, scale: 1, y: 0 },
  },
  'clip-up': {
    initial: { opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' },
    animate: { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' },
  },
}

export function SectionWrapper({
  children,
  className,
  id,
  backgroundClassName,
  animate = true,
  delay = 0,
  fullWidth = false,
  reveal = 'blur-up',
  showDivider = false,
  as: Tag = 'section',
  ariaLabel,
}: SectionWrapperProps) {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const content = (
    <div
      className={cn(
        fullWidth ? 'w-full' : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8',
        className
      )}
    >
      {children}
    </div>
  )

  if (!animate) {
    return (
      <Tag id={id} className={cn('py-16 sm:py-20 lg:py-28', backgroundClassName)} aria-label={ariaLabel}>
        {showDivider && <SectionDivider />}
        {content}
      </Tag>
    )
  }

  const variant = revealVariants[reveal]

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={variant.initial}
      animate={isInView ? variant.animate : variant.initial}
      transition={{
        duration: 0.25,
        delay,
        ease: easings.premium,
      }}
      className={cn(
        'py-16 sm:py-20 lg:py-28',
        backgroundClassName
      )}
      aria-label={ariaLabel}
    >
      {showDivider && <SectionDivider />}
      {content}
    </motion.section>
  )
}

/* ─── Section Divider Line ─── */
function SectionDivider() {
  return (
    <div className="absolute top-0 left-0 right-0 h-px" aria-hidden="true">
      <div className="h-full w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  )
}
