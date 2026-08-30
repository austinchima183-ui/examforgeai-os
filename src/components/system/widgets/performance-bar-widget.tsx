'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { BarChart3 } from 'lucide-react'
import { SectionCard } from '@/components/system/section-card'
import { Skeleton } from '@/components/ui/skeleton'

// Deferred chart body — keeps recharts off the initial critical path.
const PerformanceBarChart = dynamic(() => import('./charts/performance-bar-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full rounded-lg" />,
})

// Compact empty state — keeps empty chart widgets visually tight
function CompactChartEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.06] bg-white/[0.015] px-6 py-8 text-center">
      <BarChart3 className="mb-2.5 h-5 w-5 text-foreground/25" aria-hidden="true" />
      <p className="text-[13px] font-medium text-foreground/70">{title}</p>
      <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

// ============================================================================
// ExamForge AI OS — PerformanceBarWidget
// ============================================================================
// Horizontal bar chart of real aggregates (per-subject averages, per-exam
// averages, score distribution buckets, revenue by day). Includes honest
// empty state + skeleton loading.
// ============================================================================

export interface PerformanceBarWidgetProps {
  data: Array<{ name: string; value: number }>
  /** Value formatting: "percent" (0-100 with %), "number", "currency" */
  valueFormat?: 'percent' | 'number' | 'currency'
  /** Max domain for the axis (default 100 for percent) */
  domainMax?: number
  title: string
  description?: string
  icon?: string
  loading?: boolean
  /** Content-only render (no SectionCard frame) — for embedding in WidgetGrid */
  bare?: boolean
  /** Override empty-state copy */
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

export function PerformanceBarWidget({
  data,
  valueFormat = 'percent',
  domainMax,
  title,
  description,
  icon,
  loading = false,
  emptyTitle = 'No data yet',
  emptyDescription = 'This chart fills in automatically as real activity accumulates.',
  className,
  bare = false,
}: PerformanceBarWidgetProps) {

  const content = loading ? (
        <Skeleton className="h-[220px] w-full rounded-lg" />
      ) : data.length === 0 ? (
        <CompactChartEmpty title={emptyTitle} description={emptyDescription} />
      ) : (
        <PerformanceBarChart data={data} valueFormat={valueFormat} domainMax={domainMax} />
  )

  if (bare) {
    return <div className={className}>{content}</div>
  }

  return (
    <SectionCard
      title={title}
      description={description}
      icon={icon}
      tier="surface"
      className={className}
    >
      {content}
    </SectionCard>
  )
}
