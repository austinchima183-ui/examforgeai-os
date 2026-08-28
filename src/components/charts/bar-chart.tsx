'use client'

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from '@/components/ui/chart'

// ============================================================================
// ExamForge AI — Bar Chart Component
// ============================================================================
// Recharts BarChart with responsive container, themed tooltips, and
// configurable data keys + colors. Uses shadcn/ui chart primitives.
// Premium AI OS visual treatment applied.
// ============================================================================

export interface BarChartProps<T extends object = Record<string, unknown>> {
  data: T[]
  xKey: string
  yKeys: string[]
  colors?: string[]
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  className?: string
  stacked?: boolean
}

// ──────────────────────────────────────────────────────────────
// Default color palette (avoiding indigo/blue)
// ──────────────────────────────────────────────────────────────

const DEFAULT_COLORS = [
  'hsl(142, 71%, 45%)',   // emerald
  'hsl(346, 77%, 50%)',   // rose
  'hsl(38, 92%, 50%)',    // amber
  'hsl(262, 83%, 58%)',   // violet
  'hsl(185, 76%, 44%)',   // cyan
  'hsl(330, 81%, 60%)',   // pink
]

export function BarChart<T extends object = Record<string, unknown>>({
  data,
  xKey,
  yKeys,
  colors = DEFAULT_COLORS,
  height = 300,
  showGrid = true,
  showLegend = true,
  className,
  stacked = false,
}: BarChartProps<T>) {
  // Build chart config from yKeys
  const chartConfig: ChartConfig = {}
  yKeys.forEach((key, index) => {
    chartConfig[key] = {
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      color: colors[index % colors.length],
    }
  })

  return (
    <ChartContainer config={chartConfig} className={className} style={{ height }}>
      <RechartsBarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 12 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />}
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          tick={{ fill: 'rgba(255,255,255,0.4)' }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={12}
          tick={{ fill: 'rgba(255,255,255,0.4)' }}
        />
        <ChartTooltip
          content={<ChartTooltipContent className="forge-glass-elevated border border-border/30 rounded-lg shadow-lg" />}
        />
        {showLegend && (
          <ChartLegend
            content={<ChartLegendContent payload={[]} />}
          />
        )}
        {yKeys.map((key, index) => (
          <Bar
            key={key}
            type="monotone"
            dataKey={key}
            fill={colors[index % colors.length]}
            radius={stacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsBarChart>
    </ChartContainer>
  )
}
