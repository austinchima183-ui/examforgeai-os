'use client'

import * as React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { resolveIcon } from '@/lib/design/icon-registry'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// ExamForge AI OS — HeroSection
// ============================================================================
// Premium dashboard hero panel (Stripe/Vercel dashboard style):
// - Layered ambient glows (electric blue + neural cyan) on the #090909 void
// - Greeting + user name in gradient text, live context description
// - Role/status badge row
// - Inline hero stats (real live KPIs, not decoration)
// - Primary actions on the right
// - Subtle entrance animation (respects reduced motion)
// RSC-safe: all props are serializable (strings / React elements).
// ============================================================================

export interface HeroStat {
  label: string
  value: string | number
  /** RSC-safe icon registry name (e.g. "calendar-days") */
  icon?: string
  /** Accent tone for the value */
  tone?: 'default' | 'blue' | 'cyan' | 'ember' | 'gold' | 'emerald'
}

export interface HeroSectionProps {
  /** e.g. "Good morning" */
  greeting: string
  /** User first name / workspace name */
  name: string
  /** Context line under the greeting */
  description: string
  /** Badge label (e.g. role) */
  badge?: string
  /** RSC-safe icon registry name for the badge */
  badgeIcon?: string
  /** Live stats rendered inline — real data only */
  stats?: HeroStat[]
  /** Right-aligned action buttons */
  actions?: React.ReactNode
  className?: string
}

const toneClass: Record<NonNullable<HeroStat['tone']>, string> = {
  default: 'text-foreground',
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
  ember: 'text-amber-400',
  gold: 'text-amber-300',
  emerald: 'text-emerald-400',
}

export function HeroSection({
  greeting,
  name,
  description,
  badge,
  badgeIcon,
  stats,
  actions,
  className,
}: HeroSectionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'forge-glass-surface border border-white/[0.06] forge-card-shadow',
        'px-6 py-6 sm:px-8 sm:py-7',
        className,
      )}
      aria-label="Dashboard overview"
    >
      {/* ── Ambient layers (purely decorative) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      >
        {/* Electric blue glow — top left */}
        <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-blue-500/[0.13] blur-[80px]" />
        {/* Neural cyan glow — bottom right */}
        <div className="absolute -bottom-28 right-10 h-64 w-72 rounded-full bg-cyan-400/[0.09] blur-[90px]" />
        {/* Forge gold hairline glow */}
        <div className="absolute -bottom-20 -left-10 h-40 w-56 rounded-full bg-amber-400/[0.05] blur-[70px]" />
        {/* Grid texture */}
        <div className="absolute inset-0 forge-grid-texture opacity-[0.35]" />
        {/* Bottom fade line */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-400/25 to-transparent" />
      </div>

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* ── Left: greeting + stats ── */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            {badge && (
              <Badge
                variant="secondary"
                className="gap-1 border-blue-400/25 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-300"
              >
                {(() => {
                  const Icon = resolveIcon(badgeIcon)
                  return Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null
                })()}
                {badge}
              </Badge>
            )}
            <span className="status-live text-[11px] font-medium tracking-wide text-cyan-400/70">
              Live · real-time data
            </span>
          </div>

          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-[32px] sm:leading-[1.15]">
            {greeting}, <span className="forge-gradient-text">{name}</span>
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>

          {stats && stats.length > 0 && (
            <dl className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3">
              {stats.map((stat) => {
                const Icon = resolveIcon(stat.icon)
                return (
                  <div key={stat.label} className="flex items-center gap-2.5">
                    {Icon && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.05] bg-white/[0.03]">
                        <Icon className="h-3.5 w-3.5 text-foreground/60" aria-hidden="true" />
                      </span>
                    )}
                    <div>
                      <dd
                        className={cn(
                          'text-lg font-semibold leading-none tabular-nums',
                          toneClass[stat.tone ?? 'default'],
                        )}
                      >
                        {stat.value}
                      </dd>
                      <dt className="mt-1 text-[11px] text-muted-foreground">{stat.label}</dt>
                    </div>
                  </div>
                )
              })}
            </dl>
          )}
        </div>

        {/* ── Right: actions ── */}
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5 lg:justify-end">
            {actions}
          </div>
        )}
      </div>
    </motion.section>
  )
}
