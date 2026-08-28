'use client'

import * as React from 'react'
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart3 } from 'lucide-react'
import { SectionCard } from '@/components/system/section-card'
import { Skeleton } from '@/components/ui/skeleton'

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
  /** Override empty-state copy */
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

const PALETTE = [
  '#3B82F6', // electric blue
  '#22D3EE', // neural cyan
  '#F59E0B', // ember
  '#FBBF24', // forge gold
  '#A78BFA', // violet accent
  '#34D399', // emerald
]

function formatValue(value: number, format: 'percent' | 'number' | 'currency'): string {
  if (format === 'percent') return `${value}%`
  if (format === 'currency') {
    return `₦${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  return value.toLocaleString('en-US')
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
}: PerformanceBarWidgetProps) {
  const max = domainMax ?? (valueFormat === 'percent' ? 100 : undefined)

  return (
    <SectionCard
      title={title}
      description={description}
      icon={icon}
      tier="surface"
      className={className}
    >
      {loading ? (
        <Skeleton className="h-[220px] w-full rounded-lg" />
      ) : data.length === 0 ? (
        <CompactChartEmpty title={emptyTitle} description={emptyDescription} />
      ) : (
        <ChartContainer
          config={{
            value: { label: 'Value', color: 'hsl(217, 91%, 60%)' },
          }}
          className="h-[220px] w-full"
        >
          <RechartsBarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
            <XAxis
              type="number"
              domain={max !== undefined ? [0, max] : [0, 'dataMax']}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tick={{ fill: 'rgba(255,255,255,0.38)' }}
              tickFormatter={(v: number) => (valueFormat === 'currency' ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={116}
              tick={{ fill: 'rgba(255,255,255,0.55)' }}
              tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
            />
            <ChartTooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              content={
                <ChartTooltipContent
                  className="forge-glass-elevated rounded-lg border border-border/30 shadow-lg"
                  formatter={(value) => (
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatValue(Number(value), valueFormat)}
                    </span>
                  )}
                />
              }
            />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              isAnimationActive
              animationDuration={700}
              barSize={16}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={PALETTE[index % PALETTE.length]} fillOpacity={0.85} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ChartContainer>
      )}
    </SectionCard>
  )
}
