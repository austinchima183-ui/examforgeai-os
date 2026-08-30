'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

// ============================================================================
// ExamForge AI OS — AnimatedNumber
// ============================================================================
// Counts a number up from 0 to its final value on mount (KPI "live" feel).
// - SSR renders the final value (no hydration mismatch, no layout shift).
// - Animation runs only on the client after mount.
// - Respects prefers-reduced-motion (WCAG 2.3.3) — renders final value.
// ============================================================================

export interface AnimatedNumberProps {
  /** Final value to count up to */
  value: number
  /** Animation duration in seconds (default 0.9) */
  duration?: number
  /** Fixed decimal places (default 0) */
  decimals?: number
  /** Optional locale formatting (default "en-US") */
  locale?: string
  /** Suffix rendered after the number (e.g. "%", "+") */
  suffix?: string
  /** Prefix rendered before the number (e.g. "₦") */
  prefix?: string
  className?: string
}

export function AnimatedNumber({
  value,
  duration = 0.9,
  decimals = 0,
  locale = 'en-US',
  suffix,
  prefix,
  className,
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion()
  // Start at the final value — SSR and the first client render agree.
  const [display, setDisplay] = useState(value)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (prefersReducedMotion) return
    // Animate only once on mount (not on every value change)
    if (hasAnimated.current) {
      setDisplay(value)
      return
    }
    hasAnimated.current = true

    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [value, duration, prefersReducedMotion])

  const formatted = display.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

// ──────────────────────────────────────────────────────────────
// Helper: parse "85%", "1,234", "₦12,500" style KPI values into
// { number, prefix, suffix } so mixed string values can animate too.
// ──────────────────────────────────────────────────────────────

export interface ParsedNumber {
  prefix: string
  numeric: number
  suffix: string
  decimals: number
}

export function parseKpiValue(value: string | number | null | undefined): ParsedNumber | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') {
    return { prefix: '', numeric: value, suffix: '', decimals: Number.isInteger(value) ? 0 : 1 }
  }
  const match = value.match(/^([^\d]*)([\d,]*\.?\d+)(.*)$/)
  if (!match) return null
  const numeric = Number(match[2].replace(/,/g, ''))
  if (!Number.isFinite(numeric)) return null
  const decimals = match[2].includes('.') ? match[2].split('.')[1].length : 0
  return { prefix: match[1], numeric, suffix: match[3], decimals }
}
