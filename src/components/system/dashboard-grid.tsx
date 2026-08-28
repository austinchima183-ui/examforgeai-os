'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI OS — DashboardGrid (Responsive Grid System)
// ============================================================================
// Enterprise dashboard grid:
//   Desktop (xl+): 12 columns
//   Tablet  (md+): 8 columns
//   Mobile  (base): 4 columns
//
// Widgets specify an explicit span at each breakpoint via <GridItem span={...}>
// and resize intelligently. Class strings come from static lookup tables so
// Tailwind's JIT compiler sees every possible class (no dynamic class names).
//
// Usage:
//   <DashboardGrid>
//     <GridItem span={{ base: 4, md: 4, xl: 3 }}>  // quarter width on desktop
//     <GridItem span={{ base: 4, md: 8, xl: 8 }}>  // two-thirds on desktop
//   </DashboardGrid>
// ============================================================================

export interface DashboardGridProps {
  children: React.ReactNode
  className?: string
  /** Gap between grid cells (default 4 = 16px) */
  gap?: '3' | '4' | '5' | '6'
}

const gapMap: Record<string, string> = {
  '3': 'gap-3',
  '4': 'gap-4',
  '5': 'gap-5',
  '6': 'gap-6',
}

export function DashboardGrid({ children, className, gap = '4' }: DashboardGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-4 md:grid-cols-8 xl:grid-cols-12',
        gapMap[gap],
        className,
      )}
    >
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// GridItem — a span-aware grid cell
// ──────────────────────────────────────────────────────────────

export interface GridItemSpan {
  /** Columns spanned on mobile (4-col grid, default 4 = full width) */
  base?: 1 | 2 | 3 | 4
  /** Columns spanned on tablet (8-col grid, default 8 = full width) */
  md?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  /** Columns spanned on desktop (12-col grid, default 12 = full width) */
  xl?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
}

export interface GridItemProps {
  span?: GridItemSpan
  children?: React.ReactNode
  className?: string
  /** Renders as a different element (default div) */
  as?: 'div' | 'section' | 'article' | 'aside'
}

const baseSpanMap: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
}

const mdSpanMap: Record<number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-7',
  8: 'md:col-span-8',
}

const xlSpanMap: Record<number, string> = {
  1: 'xl:col-span-1',
  2: 'xl:col-span-2',
  3: 'xl:col-span-3',
  4: 'xl:col-span-4',
  5: 'xl:col-span-5',
  6: 'xl:col-span-6',
  7: 'xl:col-span-7',
  8: 'xl:col-span-8',
  9: 'xl:col-span-9',
  10: 'xl:col-span-10',
  11: 'xl:col-span-11',
  12: 'xl:col-span-12',
}

export function GridItem({ span, children, className, as = 'div' }: GridItemProps) {
  const base = baseSpanMap[span?.base ?? 4] ?? 'col-span-4'
  const md = mdSpanMap[span?.md ?? 8] ?? 'md:col-span-8'
  const xl = xlSpanMap[span?.xl ?? 12] ?? 'xl:col-span-12'
  const Tag = as
  return <Tag className={cn(base, md, xl, 'min-w-0', className)}>{children}</Tag>
}

// ──────────────────────────────────────────────────────────────
// Conventional span presets (keeps dashboards consistent)
// ──────────────────────────────────────────────────────────────

export const gridSpans = {
  /** Full-width widget */
  full: { base: 4 as const, md: 8 as const, xl: 12 as const },
  /** Two-thirds widget (charts, main lists) */
  wide: { base: 4 as const, md: 8 as const, xl: 8 as const },
  /** Third widget (side rail) */
  third: { base: 4 as const, md: 4 as const, xl: 4 as const },
  /** Quarter widget (KPI cards) */
  quarter: { base: 4 as const, md: 4 as const, xl: 3 as const },
  /** Half widget */
  half: { base: 4 as const, md: 8 as const, xl: 6 as const },
  /** 5/12 widget */
  narrow: { base: 4 as const, md: 8 as const, xl: 5 as const },
  /** 7/12 widget */
  main: { base: 4 as const, md: 8 as const, xl: 7 as const },
}
