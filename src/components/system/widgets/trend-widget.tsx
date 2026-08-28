'use client'

import * as React from 'react'
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { LineChart } from 'lucide-react'
import { SectionCard } from '@/components/system/section-card'
import { Skeleton } from '@/components/ui/skeleton'

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
}

const accents = {
  blue: { stroke: '#3B82F6', gradientId: 'trendFillBlue' },
  cyan: { stroke: '#22D3EE', gradientId: 'trendFillCyan' },
  emerald: { stroke: '#34D399', gradientId: 'trendFillEmerald' },
  amber: { stroke: '#F59E0B', gradientId: 'trendFillAmber' },
}

function formatNumber(value: number, format: 'number' | 'currency'): string {
  if (format === 'currency') {
    return `₦${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  return value.toLocaleString('en-US')
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
}: TrendWidgetProps) {
  const accent = accents[color]

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
      {loading ? (
        <Skeleton className="h-[220px] w-full rounded-lg" />
      ) : data.length === 0 ? (
        <CompactTrendEmpty title={emptyTitle} description={emptyDescription} />
      ) : (
        <ChartContainer
          config={{
            value: { label: title, color: accent.stroke },
          }}
          className="h-[220px] w-full"
        >
          <RechartsAreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id={accent.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent.stroke} stopOpacity={0.26} />
                <stop offset="100%" stopColor={accent.stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              tick={{ fill: 'rgba(255,255,255,0.38)' }}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tick={{ fill: 'rgba(255,255,255,0.38)' }}
              width={48}
              tickFormatter={(v: number) =>
                v >= 1000
                  ? format === 'currency'
                    ? `${(v / 1000).toFixed(0)}k`
                    : v.toLocaleString('en-US')
                  : `${v}`
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="forge-glass-elevated rounded-lg border border-border/30 shadow-lg"
                  formatter={(value) => (
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatNumber(Number(value), format)}
                    </span>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={accent.stroke}
              strokeWidth={2}
              fill={`url(#${accent.gradientId})`}
              isAnimationActive
              animationDuration={800}
              dot={false}
              activeDot={{ r: 4, fill: accent.stroke, strokeWidth: 0 }}
            />
          </RechartsAreaChart>
        </ChartContainer>
      )}
    </SectionCard>
  )
}
