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

// ============================================================================
// TrendChart — deferred chart body (dynamically imported by trend-widget so
// recharts stays off the initial critical path).
// ============================================================================

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

export interface TrendChartProps {
  data: Array<{ date: string; value: number }>
  title: string
  format: 'number' | 'currency'
  color: 'blue' | 'cyan' | 'emerald' | 'amber'
}

export default function TrendChart({ data, title, format, color }: TrendChartProps) {
  const accent = accents[color]
  return (
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
  )
}
