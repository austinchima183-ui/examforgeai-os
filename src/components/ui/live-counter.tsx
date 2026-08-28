'use client'

import React, { useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'

// ---------------------------------------------------------------------------
// Format types
// ---------------------------------------------------------------------------
type FormatType = 'number' | 'currency' | 'percentage'

interface FormatOptions {
  type: FormatType
  /** Currency code (for currency format, default "USD") */
  currency?: string
  /** Number of decimal places (default 0) */
  decimals?: number
  /** Locale for Intl formatting (default "en-US") */
  locale?: string
}

// ---------------------------------------------------------------------------
// Format the raw number → display string
// ---------------------------------------------------------------------------
function formatValue(value: number, options: FormatOptions): string {
  const { type, currency = 'USD', decimals = 0, locale = 'en-US' } = options

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value)
    case 'percentage':
      return `${value.toFixed(decimals)}%`
    case 'number':
    default:
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value)
  }
}

// ---------------------------------------------------------------------------
// Reduced-motion check
// ---------------------------------------------------------------------------
const useReducedMotion = (): boolean => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  return false
}

// ---------------------------------------------------------------------------
// LiveCounter — animated number transitions with spring physics
// ---------------------------------------------------------------------------
export interface LiveCounterProps {
  /** Target value to animate towards */
  value: number
  /** Format type: number | currency | percentage */
  format?: FormatOptions
  /** Spring stiffness (higher = snappier) */
  stiffness?: number
  /** Spring damping */
  damping?: number
  /** Additional CSS classes */
  className?: string
  /** Prefix string (e.g. "$") */
  prefix?: string
  /** Suffix string (e.g. "+") */
  suffix?: string
  /** Label shown below the counter */
  label?: string
}

export function LiveCounter({
  value,
  format = { type: 'number' },
  stiffness = 100,
  damping = 20,
  className = '',
  prefix,
  suffix,
  label,
}: LiveCounterProps) {
  const reduced = useReducedMotion()

  // Spring that animates from old → new value
  const spring = useSpring(0, {
    stiffness: reduced ? 1000 : stiffness,
    damping: reduced ? 100 : damping,
    mass: 0.5,
  })

  // Push the spring target whenever `value` changes
  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  // Transform the spring value → formatted string
  const display = useTransform(spring, (v) => {
    const rounded = Math.round(v * 100) / 100
    return formatValue(rounded, format)
  })

  // Subscribe to motion value changes (React can't read them directly)
  const [displayText, setDisplayText] = useState(() => formatValue(value, format))

  useEffect(() => {
    const unsub = display.on('change', (v) => setDisplayText(v))
    return unsub
  }, [display])

  return (
    <div className={`flex flex-col items-center tabular-nums ${className}`}>
      <span className="text-3xl font-bold tracking-tight text-foreground">
        {prefix}
        {displayText}
        {suffix}
      </span>
      {label && (
        <span className="mt-1 text-sm font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LiveCounterInline — smaller, inline variant for dashboards
// ---------------------------------------------------------------------------
export interface LiveCounterInlineProps {
  value: number
  format?: FormatOptions
  className?: string
  prefix?: string
  suffix?: string
}

export function LiveCounterInline({
  value,
  format = { type: 'number' },
  className = '',
  prefix,
  suffix,
}: LiveCounterInlineProps) {
  const reduced = useReducedMotion()

  const spring = useSpring(0, {
    stiffness: reduced ? 1000 : 120,
    damping: reduced ? 100 : 18,
    mass: 0.5,
  })

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  const display = useTransform(spring, (v) => {
    const rounded = Math.round(v * 100) / 100
    return formatValue(rounded, format)
  })

  const [displayText, setDisplayText] = useState(() => formatValue(value, format))

  useEffect(() => {
    const unsub = display.on('change', (v) => setDisplayText(v))
    return unsub
  }, [display])

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {displayText}
      {suffix}
    </span>
  )
}

// ---------------------------------------------------------------------------
// TrendIndicator — up/down arrow with color
// ---------------------------------------------------------------------------
export interface TrendIndicatorProps {
  value: number
  previousValue: number
  className?: string
}

export function TrendIndicator({ value, previousValue, className = '' }: TrendIndicatorProps) {
  const diff = value - previousValue
  const isUp = diff > 0
  const isNeutral = diff === 0

  return (
    <motion.span
      className={`inline-flex items-center gap-0.5 text-sm font-medium ${
        isNeutral ? 'text-muted-foreground' : isUp ? 'text-green-600 dark:text-green-400' : 'text-destructive'
      } ${className}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {!isNeutral && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className={isUp ? '' : 'rotate-180'}>
          <path d="M6 2l4 6H2z" />
        </svg>
      )}
      {isNeutral ? '—' : `${Math.abs(diff)}`}
    </motion.span>
  )
}
