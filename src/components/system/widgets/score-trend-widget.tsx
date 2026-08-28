'use client'

import * as React from 'react'
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { TrendingUp } from 'lucide-react'
import { SectionCard } from '@/components/system/section-card'
import { Skeleton } from '@/components/ui/skeleton'

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
}: ScoreTrendWidgetProps) {
  const chartData = data.map((point) => ({
    ...point,
    formattedDate: formatDate(point.date),
  }))

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
      {loading ? (
        <Skeleton className="h-[220px] w-full rounded-lg" />
      ) : chartData.length === 0 ? (
        <CompactWidgetEmpty
          title="No graded exams yet"
          description="Your score progression will appear here as soon as you complete your first graded exam."
        />
      ) : (
        <ChartContainer
          config={{
            score: { label: 'Score', color: 'hsl(217, 91%, 60%)' },
          }}
          className="h-[220px] w-full"
        >
          <RechartsAreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="formattedDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: 'rgba(255,255,255,0.38)' }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tick={{ fill: 'rgba(255,255,255,0.38)' }}
              width={36}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="forge-glass-elevated rounded-lg border border-border/30 shadow-lg"
                  formatter={(
                    value: unknown,
                    _name: string,
                    item: Record<string, unknown>,
                  ) => {
                    const payload = (Array.isArray(item.payload) ? item.payload[0] : item.payload) as
                      | { label?: string }
                      | undefined
                    return (
                      <div className="flex w-full flex-col gap-0.5">
                        <span className="text-[11px] text-muted-foreground">
                          {payload?.label}
                        </span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {String(value)}%
                        </span>
                      </div>
                    )
                  }}
                />
              }
            />
            {referenceValue > 0 && (
              <ReferenceLine
                y={referenceValue}
                stroke="rgba(245, 158, 11, 0.4)"
                strokeDasharray="4 4"
                label={{
                  value: `Pass ${referenceValue}%`,
                  position: 'insideTopRight',
                  fill: 'rgba(245, 158, 11, 0.7)',
                  fontSize: 10,
                }}
              />
            )}
            <Area
              type="monotone"
              dataKey="score"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#scoreFill)"
              isAnimationActive
              animationDuration={800}
              dot={{ r: 2.5, fill: '#3B82F6', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#22D3EE', strokeWidth: 0 }}
            />
          </RechartsAreaChart>
        </ChartContainer>
      )}
    </SectionCard>
  )
}
