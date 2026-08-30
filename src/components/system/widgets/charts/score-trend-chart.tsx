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

// ============================================================================
// ScoreTrendChart — deferred chart body (dynamically imported by
// score-trend-widget so the ~360KB recharts bundle stays OFF the initial
// page-load critical path; the widget shell + empty states render instantly).
// ============================================================================

export interface ScoreTrendChartProps {
  chartData: Array<{ date: string; score: number; label: string; formattedDate: string }>
  referenceValue: number
}

export default function ScoreTrendChart({ chartData, referenceValue }: ScoreTrendChartProps) {
  return (
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
  )
}
