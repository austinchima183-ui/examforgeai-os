'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { SectionCard } from './section-card'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// ExamForge AI OS — ChartCard
// ============================================================================
// Standard chart wrapper for dashboards. Wraps SectionCard with:
// - Title + description + optional legend badges
// - Responsive container that handles Recharts / ECharts sizing
// - Loading skeleton slot (when data is loading)
// - Empty state slot (when no data)
// - Optional footer (totals, deltas, summaries)
//
// Children should be a chart (e.g. <ResponsiveContainer>...</ResponsiveContainer>).
// ============================================================================

export interface ChartCardSeries {
  label: string
  /** Tailwind text color class for the legend dot */
  color?: string
}

export interface ChartCardProps {
  title: string
  description?: string
  /** Series labels for the legend — rendered as inline badges */
  series?: ChartCardSeries[]
  /** Height of the chart area (default 240px) */
  height?: number | string
  /** Loading state — renders a skeleton */
  loading?: boolean
  /** Empty state — renders when data is empty */
  empty?: boolean
  /** Empty state node */
  emptyState?: React.ReactNode
  /** Optional footer (totals, deltas, summaries) */
  footer?: React.ReactNode
  /** Optional right-aligned action (e.g. "View detailed analytics") */
  action?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function ChartCard({
  title,
  description,
  series,
  height = 240,
  loading = false,
  empty = false,
  emptyState,
  footer,
  action,
  className,
  children,
}: ChartCardProps) {
  return (
    <SectionCard
      title={title}
      description={description}
      action={
        action ? (
          action
        ) : series && series.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {series.map((s, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="text-[10px] px-1.5 h-5 bg-white/[0.04] border-white/[0.06] text-foreground/70"
              >
                <span
                  className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full mr-1',
                    s.color ?? 'bg-foreground/40',
                  )}
                />
                {s.label}
              </Badge>
            ))}
          </div>
        ) : undefined
      }
      className={className}
    >
      <div
        className="relative w-full"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        {loading ? (
          <ChartSkeleton height={height} />
        ) : empty ? (
          emptyState ?? <DefaultEmptyState />
        ) : (
          children
        )}
      </div>
      {footer && (
        <div className="mt-3 pt-3 border-t border-white/[0.04] text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </SectionCard>
  )
}

function ChartSkeleton({ height }: { height: number | string }) {
  return (
    <div className="absolute inset-0 flex items-end gap-1.5 px-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-sm bg-white/[0.04]"
          initial={{ height: '20%' }}
          animate={{
            height: `${20 + Math.sin(i * 0.7) * 30 + 30}%`,
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            height: { duration: 0.6, delay: i * 0.05 },
            opacity: { duration: 1.5, repeat: Infinity, delay: i * 0.1 },
          }}
          style={{ minHeight: 8 }}
        />
      ))}
    </div>
  )
}

function DefaultEmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-white/[0.04] flex items-center justify-center">
          <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
        </div>
        <p className="text-xs text-muted-foreground">No data to display</p>
      </div>
    </div>
  )
}
