'use client'

import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { resolveIcon } from '@/lib/design/icon-registry'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// ============================================================================
// ExamForge AI — Stat Card Component (Premium)
// ============================================================================
// Animated stat card with Framer Motion entrance, glass effect, trend indicator,
// and responsive layout. Uses forge design system utilities.
// ============================================================================

export type TrendDirection = 'up' | 'down' | 'neutral'

export interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: string | LucideIcon
  trend?: TrendDirection
  trendValue?: string
  className?: string
  /** Optional gradient overlay class (e.g., "from-blue-500/5 to-transparent") */
  gradient?: string
  /** Optional icon background color class */
  iconBg?: string
  /** Optional icon color class */
  iconColor?: string
}

// ──────────────────────────────────────────────────────────────
// Trend Color Mapping
// ──────────────────────────────────────────────────────────────

const trendConfig: Record<
  TrendDirection,
  { color: string; bgColor: string; icon: string | LucideIcon }
> = {
  up: {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: TrendingUp,
  },
  down: {
    color: 'text-destructive',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    icon: TrendingDown,
  },
  neutral: {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    icon: Minus,
  },
}

// ──────────────────────────────────────────────────────────────
// Stat Card Component
// ──────────────────────────────────────────────────────────────

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  className,
  gradient,
  iconBg = 'bg-primary/10',
  iconColor = 'text-primary',
}: StatCardProps) {
  const ResolvedIcon = resolveIcon(Icon) ?? TrendingUp
  const trendInfo = trendConfig[trend]
  const TrendIcon = trendInfo.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className="group"
    >
      <Card className={cn(
        'relative overflow-hidden forge-glass-surface border border-white/[0.04] rounded-xl forge-card-shadow transition-all duration-300 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] hover:-translate-y-0.5',
        className
      )}>
        {/* Gradient overlay */}
        {gradient && (
          <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none', gradient)} />
        )}
        <CardHeader className="relative flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg backdrop-blur-sm border border-white/[0.04]',
            iconBg
          )}>
            <ResolvedIcon className={cn('h-4 w-4', iconColor)} />
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">{value}</span>
            {trendValue && (
              <div
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
                  trendInfo.bgColor,
                  trendInfo.color
                )}
              >
                <TrendIcon className="h-3 w-3" />
                {trendValue}
              </div>
            )}
          </div>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
