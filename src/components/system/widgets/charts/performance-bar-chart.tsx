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

// ============================================================================
// PerformanceBarChart — deferred chart body (dynamically imported by
// performance-bar-widget so recharts stays off the initial critical path).
// ============================================================================

const PALETTE = [
  '#3B82F6', // electric blue
  '#22D3EE', // neural cyan
  '#F59E0B', // ember
  '#FBBF24', // forge gold
  '#A78BFA', // violet accent
  '#34D399', // emerald
]

export interface PerformanceBarChartProps {
  data: Array<{ name: string; value: number }>
  valueFormat: 'percent' | 'number' | 'currency'
  domainMax?: number
}

function formatValue(value: number, format: 'percent' | 'number' | 'currency'): string {
  if (format === 'percent') return `${value}%`
  if (format === 'currency') {
    return `₦${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }
  return value.toLocaleString('en-US')
}

export default function PerformanceBarChart({ data, valueFormat, domainMax }: PerformanceBarChartProps) {
  const max = domainMax ?? (valueFormat === 'percent' ? 100 : undefined)
  return (
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
  )
}
