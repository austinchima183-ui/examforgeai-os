'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { TrendingUp } from 'lucide-react'
import { SectionCard } from '@/components/system/section-card'
import { Skeleton } from '@/components/ui/skeleton'

// Deferred chart body — keeps the ~360KB recharts bundle off the initial
// critical path. The widget shell, header, and empty states render instantly;
// the chart streams in right after first paint.
const ScoreTrendChart = dynamic(() => import('./charts/score-trend-chart'), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full rounded-lg" />,
})

// ──────────────────────────────────────────────────────────
// Compact empty state for chart widgets — keeps empty widgets
// visually tight (no huge dead space) while staying honest.
// ─────────────────────────────────────────────────────────
function CompactWidgetEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.06] bg-white/[0.015] px-6 py-8 text-center">
      <TrendingUp className="mb-2.5 h-5 w-5 text-foreground/25" aria-hidden="true" />
      <p className="text-[13px] font-medium text-foreground/70">{title}</p>
      <p className="mt-1 max-w-sm text-[11.5px] leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}

// ============================================================================
// ExamForge AI OS — ScoreTrendWidget
// ============================================================================
// Live analytics area chart of the student's score progression, built from
// real graded sessions. Shows the pass-mark reference line, honest empty
// state when no graded work exists yet, and skeleton while loading.
// ============================================================================

export interface ScoreTrendWidgetProps {
  /** Real score points from the DB — { date, score, label } */
  data: Array<{ date: string; score: number; label: string }>
  /** Reference line value (e.g. pass mark) */
  referenceValue?: number
  loading?: boolean
  title?: string
  description?: string
  className?: string
  /** Content-only render (no SectionCard frame) — for embedding in WidgetGrid */
  bare?: boolean
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export function ScoreTrendWidget({
  data,
  referenceValue = 50,
  loading = false,
  title = 'Score Progression',
  description = 'Your performance across graded exams',
  className,
  bare = false,
}: ScoreTrendWidgetProps) {
  const chartData = data.map((point) => ({
    ...point,
    formattedDate: formatDate(point.date),
  }))

  const content = loading ? (
    <Skeleton className="h-[220px] w-full rounded-lg" />
  ) : chartData.length === 0 ? (
    <CompactWidgetEmpty
      title="No graded exams yet"
      description="Your score progression will appear here as soon as you complete your first graded exam."
    />
  ) : (
    <ScoreTrendChart chartData={chartData} referenceValue={referenceValue} />
  )

  if (bare) {
    return (
      <div className={className}>
        {data.length > 0 && (
          <div className="mb-3 flex justify-end">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
              <TrendingUp className="h-3 w-3" aria-hidden="true" />
              {data.length} results
            </span>
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
      icon="trending-up"
      tier="surface"
      className={className}
      action={
        data.length > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <TrendingUp className="h-3 w-3" aria-hidden="true" />
            {data.length} results
          </span>
        ) : undefined
      }
    >
      {content}
    </SectionCard>
  )
}
