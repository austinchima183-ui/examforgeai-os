'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { LineChart } from 'lucide-react'
import { SectionCard } from '@/components/system/section-card'
import { Skeleton } from '@/components/ui/skeleton'

// Deferred chart body — keeps recharts off the initial critical path.
const TrendChart = dynamic(() => import('./charts/trend-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full rounded-lg" />,
})

// Compact empty state — keeps empty trend widgets visually tight
function CompactTrendEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.06] bg-white/[0.015] px-6 py-8 text-center">
      <LineChart className="mb-2.5 h-5 w-5 text-foreground/25" aria-hidden="true" />
      <p className="text-[13px] font-medium text-foreground/70">{title}</p>
      <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

// ============================================================================
// ExamForge AI OS — RevenueTrendWidget / GrowthTrendWidget
// ============================================================================
// Live analytics chart for admin dashboards — revenue by day (real
// successful transactions) or user growth by day (real signups).
// ============================================================================

export interface TrendWidgetProps {
  /** Real trend points — { date: 'MM-DD', value } */
  data: Array<{ date: string; value: number }>
  title: string
  description?: string
  /** "currency" formats tooltips as ₦ amounts */
  format?: 'number' | 'currency'
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  /** Accent color */
  color?: 'blue' | 'cyan' | 'emerald' | 'amber'
  /** Big headline figure rendered top-right */
  headline?: string
  headlineLabel?: string
  className?: string
  /** Content-only render (no SectionCard frame) — for embedding in WidgetGrid */
  bare?: boolean
}

export function TrendWidget({
  data,
  title,
  description,
  format = 'number',
  loading = false,
  emptyTitle = 'No activity yet',
  emptyDescription = 'This chart fills in automatically as real transactions accumulate.',
  color = 'emerald',
  headline,
  headlineLabel,
  className,
  bare = false,
}: TrendWidgetProps) {

  const content = loading ? (
    <Skeleton className="h-[220px] w-full rounded-lg" />
  ) : data.length === 0 ? (
    <CompactTrendEmpty title={emptyTitle} description={emptyDescription} />
  ) : (
    <TrendChart data={data} title={title} format={format} color={color} />
  )

  if (bare) {
    return (
      <div className={className}>
        {headline && (
          <div className="mb-3 flex items-baseline justify-end gap-2">
            <p className="text-lg font-bold leading-none tabular-nums text-foreground">
              {headline}
            </p>
            {headlineLabel && (
              <p className="text-[10px] text-muted-foreground">{headlineLabel}</p>
            )}
          </div>
        )}
        {content}
      </div>
    )
  }

  return (
    <SectionCard
      title={title}
      description={description}
      icon="line-chart"
      tier="surface"
      className={className}
      action={
        headline ? (
          <div className="text-right">
            <p className="text-lg font-bold leading-none tabular-nums text-foreground">
              {headline}
            </p>
            {headlineLabel && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">{headlineLabel}</p>
            )}
          </div>
        ) : undefined
      }
    >
      {content}
    </SectionCard>
  )
}
