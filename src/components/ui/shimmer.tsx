'use client'

import React from 'react'
import { motion } from 'framer-motion'

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
// Shimmer gradient overlay — sweeps left → right
// ---------------------------------------------------------------------------
const SHIMMER_GRADIENT =
  'linear-gradient(110deg, var(--muted) 40%, var(--muted-foreground) 50%, var(--muted) 60%)'

// ---------------------------------------------------------------------------
// Base wrapper — handles aria-busy + shimmer overlay
// ---------------------------------------------------------------------------
interface ShimmerBaseProps {
  className?: string
  ariaLabel?: string
}

function ShimmerBase({
  className = '',
  ariaLabel = 'Loading',
  children,
}: React.PropsWithChildren<ShimmerBaseProps>) {
  const reduced = useReducedMotion()

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      {/* Shimmer overlay */}
      {!reduced && (
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: SHIMMER_GRADIENT, backgroundSize: '200% 100%' }}
          initial={{ backgroundPosition: '200% 0' }}
          animate={{ backgroundPosition: '-200% 0' }}
          transition={{ duration: 1.8, ease: 'linear', repeat: Infinity }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Text shimmer — multiple placeholder lines
// ---------------------------------------------------------------------------
export interface ShimmerTextProps {
  /** Number of lines */
  lines?: number
  /** Line height in px */
  lineHeight?: number
  /** Gap between lines in px */
  gap?: number
  className?: string
}

export function ShimmerText({
  lines = 3,
  lineHeight = 16,
  gap = 8,
  className = '',
}: ShimmerTextProps) {
  return (
    <ShimmerBase ariaLabel="Loading text" className={className}>
      <div className="flex flex-col" style={{ gap }}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="rounded-md bg-muted"
            style={{ height: lineHeight, width: i === lines - 1 ? '60%' : '100%' }}
          />
        ))}
      </div>
    </ShimmerBase>
  )
}

// ---------------------------------------------------------------------------
// Card shimmer — avatar + title + lines
// ---------------------------------------------------------------------------
export interface ShimmerCardProps {
  /** Show avatar placeholder? */
  avatar?: boolean
  /** Number of body lines */
  lines?: number
  className?: string
}

export function ShimmerCard({
  avatar = true,
  lines = 3,
  className = '',
}: ShimmerCardProps) {
  return (
    <ShimmerBase
      ariaLabel="Loading card"
      className={`rounded-xl border border-border/50 p-4 ${className}`}
    >
      <div className="flex gap-3">
        {avatar && <div className="h-10 w-10 shrink-0 rounded-full bg-muted" />}
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-muted"
            style={{ width: i === lines - 1 ? '40%' : '100%' }}
          />
        ))}
      </div>
    </ShimmerBase>
  )
}

// ---------------------------------------------------------------------------
// Table shimmer — header row + data rows
// ---------------------------------------------------------------------------
export interface ShimmerTableProps {
  /** Number of rows */
  rows?: number
  /** Number of columns */
  columns?: number
  className?: string
}

export function ShimmerTable({
  rows = 5,
  columns = 4,
  className = '',
}: ShimmerTableProps) {
  return (
    <ShimmerBase ariaLabel="Loading table" className={className}>
      {/* Header */}
      <div className="mb-3 flex gap-4 border-b border-border/40 pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-muted" style={{ flex: i === 0 ? 2 : 1 }} />
        ))}
      </div>
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex gap-4">
            {Array.from({ length: columns }).map((_, col) => (
              <div key={col} className="h-3 rounded bg-muted" style={{ flex: col === 0 ? 2 : 1 }} />
            ))}
          </div>
        ))}
      </div>
    </ShimmerBase>
  )
}

// ---------------------------------------------------------------------------
// Chart shimmer — title + bar area + legend
// ---------------------------------------------------------------------------
export interface ShimmerChartProps {
  /** Chart height */
  height?: number
  className?: string
}

export function ShimmerChart({ height = 200, className = '' }: ShimmerChartProps) {
  // Deterministic bar heights so we avoid hydration mismatch from Math.random()
  const barHeights = [65, 42, 78, 55, 88, 35, 70, 50]

  return (
    <ShimmerBase ariaLabel="Loading chart" className={className}>
      <div className="space-y-3">
        {/* Title */}
        <div className="h-4 w-1/3 rounded bg-muted" />
        {/* Chart area with bars */}
        <div
          className="flex items-end gap-2 rounded-lg bg-muted/30 p-3"
          style={{ height }}
        >
          {barHeights.map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-muted" style={{ height: `${h}%` }} />
          ))}
        </div>
        {/* Legend */}
        <div className="flex gap-4">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>
    </ShimmerBase>
  )
}

// ---------------------------------------------------------------------------
// Avatar shimmer
// ---------------------------------------------------------------------------
export interface ShimmerAvatarProps {
  /** Avatar size in px */
  size?: number
  className?: string
}

export function ShimmerAvatar({ size = 40, className = '' }: ShimmerAvatarProps) {
  return (
    <ShimmerBase ariaLabel="Loading avatar" className={`inline-flex ${className}`}>
      <div className="rounded-full bg-muted" style={{ width: size, height: size }} />
    </ShimmerBase>
  )
}

// ---------------------------------------------------------------------------
// Compound export
// ---------------------------------------------------------------------------
export const Shimmer = {
  Text: ShimmerText,
  Card: ShimmerCard,
  Table: ShimmerTable,
  Chart: ShimmerChart,
  Avatar: ShimmerAvatar,
} as const

export default Shimmer
