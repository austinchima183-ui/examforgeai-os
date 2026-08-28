'use client'

import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

// ============================================================================
// ExamForge AI — Animated Counter
// ============================================================================
// Shows the target value immediately on first paint. When the element
// enters the viewport, applies a subtle scale/opacity entrance animation.
// Uses requestAnimationFrame for smooth 60fps animation.
// Supports optional suffix (e.g., "K+", "%") and formatting.
// ============================================================================

interface AnimatedCounterProps {
  target: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
  /** Format the number with locale (e.g., 1,000 instead of 1000) */
  formatLocale?: boolean
}

export function AnimatedCounter({
  target,
  suffix = '',
  prefix = '',
  duration = 800,
  className,
  formatLocale = true,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(target)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!isInView || hasAnimated.current) return
    hasAnimated.current = true

    const startTime = performance.now()
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(eased * target)
      setCount(current)
      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }
    requestAnimationFrame(step)
  }, [isInView, target, duration])

  const formatted = formatLocale ? count.toLocaleString() : count.toString()

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
