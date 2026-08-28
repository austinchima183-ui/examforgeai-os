'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ---------------------------------------------------------------------------
// Variant color configs
// ---------------------------------------------------------------------------
const variantStyles = {
  success: {
    circle: '#22c55e',
    circleFill: 'rgba(34,197,94,0.12)',
    mark: '#ffffff',
    glow: 'rgba(34,197,94,0.25)',
  },
  warning: {
    circle: '#f59e0b',
    circleFill: 'rgba(245,158,11,0.12)',
    mark: '#ffffff',
    glow: 'rgba(245,158,11,0.25)',
  },
  error: {
    circle: '#ef4444',
    circleFill: 'rgba(239,68,68,0.12)',
    mark: '#ffffff',
    glow: 'rgba(239,68,68,0.25)',
  },
} as const

type Variant = keyof typeof variantStyles

// ---------------------------------------------------------------------------
// Reduced-motion hook (reactive)
// ---------------------------------------------------------------------------
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

// ---------------------------------------------------------------------------
// Animated SVG checkmark with circular reveal
// ---------------------------------------------------------------------------
interface CheckmarkIconProps {
  variant: Variant
  size: number
  strokeWidth: number
}

function CheckmarkIcon({ variant, size, strokeWidth }: CheckmarkIconProps) {
  const colors = variantStyles[variant]
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
      {/* Background glow */}
      <circle cx={center} cy={center} r={radius + 6} fill={colors.glow} opacity={0.4} />

      {/* Animated circle stroke — circular reveal */}
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        stroke={colors.circle}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill={colors.circleFill}
        initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      />

      {/* Checkmark path — draws after circle completes */}
      <motion.path
        d={`M${center - radius * 0.35} ${center} L${center - radius * 0.05} ${center + radius * 0.3} L${center + radius * 0.4} ${center - radius * 0.25}`}
        stroke={colors.mark}
        strokeWidth={strokeWidth + 0.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.38, duration: 0.35, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Warning mark — exclamation
// ---------------------------------------------------------------------------
function WarningIcon({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  const colors = variantStyles.warning
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
      <circle cx={center} cy={center} r={radius + 6} fill={colors.glow} opacity={0.4} />
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        stroke={colors.circle}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill={colors.circleFill}
        initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      />
      {/* Exclamation line */}
      <motion.line
        x1={center}
        y1={center - radius * 0.35}
        x2={center}
        y2={center + radius * 0.1}
        stroke={colors.mark}
        strokeWidth={strokeWidth + 0.5}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.38, duration: 0.3, ease: 'easeOut' }}
      />
      {/* Exclamation dot */}
      <motion.circle
        cx={center}
        cy={center + radius * 0.32}
        r={strokeWidth * 0.6}
        fill={colors.mark}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.55, duration: 0.2 }}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Error mark — X
// ---------------------------------------------------------------------------
function ErrorIcon({ size, strokeWidth }: { size: number; strokeWidth: number }) {
  const colors = variantStyles.error
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
      <circle cx={center} cy={center} r={radius + 6} fill={colors.glow} opacity={0.4} />
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        stroke={colors.circle}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill={colors.circleFill}
        initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.line
        x1={center - radius * 0.3}
        y1={center - radius * 0.3}
        x2={center + radius * 0.3}
        y2={center + radius * 0.3}
        stroke={colors.mark}
        strokeWidth={strokeWidth + 0.5}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.38, duration: 0.3, ease: 'easeOut' }}
      />
      <motion.line
        x1={center + radius * 0.3}
        y1={center - radius * 0.3}
        x2={center - radius * 0.3}
        y2={center + radius * 0.3}
        stroke={colors.mark}
        strokeWidth={strokeWidth + 0.5}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.48, duration: 0.3, ease: 'easeOut' }}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// SuccessAnimation
// ---------------------------------------------------------------------------
export interface SuccessAnimationProps {
  /** Whether the success state is active */
  active: boolean
  /** Variant: success (green ✓), warning (amber !), error (red ✗) */
  variant?: Variant
  /** Size of the icon in px */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Display mode */
  mode?: 'inline' | 'overlay'
  /** Optional label text shown beneath the icon */
  label?: string
  /** Callback when animation completes */
  onComplete?: () => void
}

export function SuccessAnimation({
  active,
  variant = 'success',
  size = 48,
  strokeWidth = 3,
  mode = 'inline',
  label,
  onComplete,
}: SuccessAnimationProps) {
  const reduced = useReducedMotion()

  // Auto-fire onComplete after animation finishes
  useEffect(() => {
    if (!active || !onComplete) return
    const timer = setTimeout(onComplete, reduced ? 100 : 1200)
    return () => clearTimeout(timer)
  }, [active, onComplete, reduced])

  const icon = (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={false}
      animate={reduced ? { scale: 1, opacity: 1 } : { scale: [0, 1.18, 1], opacity: 1 }}
      transition={reduced ? { duration: 0 } : { duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {variant === 'success' && <CheckmarkIcon variant="success" size={size} strokeWidth={strokeWidth} />}
      {variant === 'warning' && <WarningIcon size={size} strokeWidth={strokeWidth} />}
      {variant === 'error' && <ErrorIcon size={size} strokeWidth={strokeWidth} />}
      {label && (
        <motion.span
          className="text-sm font-medium text-muted-foreground"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          {label}
        </motion.span>
      )}
    </motion.div>
  )

  // Overlay mode: centered on backdrop
  if (mode === 'overlay') {
    return (
      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {icon}
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  // Inline mode
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
