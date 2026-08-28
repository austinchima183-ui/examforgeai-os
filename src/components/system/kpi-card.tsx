'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trendConfig, type TrendDirection } from '@/lib/design/system'
import { resolveIcon } from '@/lib/design/icon-registry'
import { AnimatedNumber, parseKpiValue } from './animated-number'

// ============================================================================
// ExamForge AI OS — KpiCard + KpiGrid
// ============================================================================
// Standard KPI card for dashboards. Renders:
// - Label (top-left) + icon (top-right, in a glass tile)
// - Big stat number (bottom-left) + optional trend chip
// - Optional sublabel / description
// - Optional sparkline slot (for inline mini-charts)
// - Hover: lift + glow + border highlight
// - Entrance: fade-in-up with stagger support
//
// Replaces the duplicated "Card forge-glass-surface border border-white/[0.04]"
// pattern in every dashboard.
// ============================================================================

export interface KpiCardProps {
  /** Label — small muted text above the value (e.g. "Upcoming Exams") */
  label: string
  /** The big number / value */
  value: string | number | null | undefined
  /** Sublabel / context (e.g. "Scheduled exams") */
  description?: string
  /** Icon to show in the top-right tile — RSC-safe: pass a registry name string
   *  (e.g. "calendar-days") from Server Components, or a LucideIcon from Client Components */
  icon: string | LucideIcon
  /** Trend direction — determines color of trendValue */
  trend?: TrendDirection
  /** Trend value text (e.g. "+12.5%", "vs last week") */
  trendValue?: string
  /** Tailwind classes for icon background tint */
  iconBg?: string
  /** Tailwind classes for icon color */
  iconColor?: string
  /** Gradient overlay (e.g. "from-primary/[0.03] to-transparent") */
  gradient?: string
  /** Optional sparkline node — rendered inline next to / below the value */
  sparkline?: React.ReactNode
  /** Optional click action — when set, renders as a button */
  onClick?: () => void
  /** Optional href — when set, renders as a link */
  href?: string
  /** Stagger index for entrance animation (default 0) */
  index?: number
  /** Animate the numeric value counting up (default true; respects reduced motion) */
  animateValue?: boolean
  className?: string
}

const trendIcons: Record<TrendDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
}

export function KpiCard({
  label,
  value,
  description,
  icon,
  trend = 'neutral',
  trendValue,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
  gradient,
  sparkline,
  onClick,
  href,
  index = 0,
  animateValue = true,
  className,
}: KpiCardProps) {
  const trendInfo = trendConfig[trend]
  const TrendIcon = trendIcons[trend]
  const Icon = resolveIcon(icon) ?? TrendingUp
  const interactive = Boolean(href || onClick)
  // Parse the value into animatable parts — pure numbers / "85%" / "₦1,200"
  const parsed = animateValue ? parseKpiValue(value) : null

  const inner = (
    <>
      {gradient && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br pointer-events-none',
            gradient,
          )}
          aria-hidden="true"
        />
      )}
      <div className="relative flex flex-row items-start justify-between space-y-0 px-5 pt-5 pb-2">
        <div className="text-sm font-medium text-muted-foreground leading-tight">
          {label}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            'backdrop-blur-sm border border-white/[0.04]',
            iconBg,
          )}
        >
          {/* createElement: Icon is resolved from the stable module-scope registry
              (resolveIcon is pure) — rendered as data so React never treats it as
              a component created during render. */}
          {React.createElement(Icon, { className: cn('h-4 w-4', iconColor), 'aria-hidden': 'true' })}
        </div>
      </div>
      <div className="relative px-5 pb-5">
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {parsed ? (
                  <AnimatedNumber
                    value={parsed.numeric}
                    decimals={parsed.decimals}
                    prefix={parsed.prefix}
                    suffix={parsed.suffix}
                  />
                ) : (
                  (value ?? '—')
                )}
              </span>
              {trendValue && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5',
                    'text-[10px] font-medium',
                    trendInfo.bgColor,
                    trendInfo.color,
                  )}
                  aria-label={`Trend ${trendInfo.label} ${trendValue}`}
                >
                  <TrendIcon className="h-3 w-3" aria-hidden="true" />
                  {trendValue}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {sparkline && (
            <div className="shrink-0" aria-hidden="true">
              {sparkline}
            </div>
          )}
        </div>
      </div>
    </>
  )

  const cardClass = cn(
    'relative overflow-hidden rounded-xl',
    'flex flex-col',
    'forge-glass-surface border border-white/[0.04] forge-card-shadow',
    'transition-all duration-300',
    'hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06]',
    interactive &&
      'cursor-pointer hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    className,
  )

  const motionWrapper = (children: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={interactive ? { y: -2 } : undefined}
      className="group h-full"
    >
      {children}
    </motion.div>
  )

  if (href) {
    return motionWrapper(
      <Link href={href} className={cardClass} aria-label={`${label}: ${value ?? 'no data'}`}>
        {inner}
      </Link>,
    )
  }

  if (onClick) {
    return motionWrapper(
      <button
        type="button"
        onClick={onClick}
        className={cn(cardClass, 'text-left w-full')}
        aria-label={`${label}: ${value ?? 'no data'}`}
      >
        {inner}
      </button>,
    )
  }

  return motionWrapper(<div className={cardClass}>{inner}</div>)
}

// ─── KpiGrid ────────────────────────────────────────────────────────────────

export interface KpiGridProps {
  children: React.ReactNode
  /** Number of columns on large screens (default 4) */
  cols?: 2 | 3 | 4
  className?: string
}

const gridCols: Record<NonNullable<KpiGridProps['cols']>, string> = {
  2: 'grid gap-4 sm:grid-cols-2',
  3: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4',
}

export function KpiGrid({ children, cols = 4, className }: KpiGridProps) {
  return <div className={cn(gridCols[cols], className)}>{children}</div>
}
