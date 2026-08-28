'use client'

// ============================================================================
// ExamForge AI — Accessible Chart Wrapper
// ============================================================================
// Wraps any recharts chart with comprehensive accessibility features:
// - Hidden data table for screen readers
// - Alt text description of chart trends
// - Keyboard navigation between data points
// - High contrast mode support
// - Proper ARIA attributes (role="img", aria-label, aria-describedby)
// WCAG 2.2 AA: 1.1.1 Non-text Content, 4.1.2 Name/Role/Value
// ============================================================================

import * as React from 'react'
import { cn } from '@/lib/utils'
import { VisuallyHidden } from '@/components/ui/visually-hidden'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface ChartDataPoint {
  /** Label for this data point (x-axis value) */
  label: string
  /** Named values for each series at this point */
  values: Record<string, number | string | null>
}

interface AccessibleChartProps {
  /** Unique identifier for this chart instance */
  chartId: string
  /** Accessible label describing the chart purpose */
  ariaLabel: string
  /** Description of chart trends for screen readers */
  trendDescription: string
  /** The chart data as structured points */
  data: ChartDataPoint[]
  /** Names of each data series (keyed by values keys) */
  seriesLabels: Record<string, string>
  /** The visual chart content (recharts components) */
  children: React.ReactNode
  /** Additional CSS class names */
  className?: string
  /** Whether keyboard navigation is enabled */
  keyboardNav?: boolean
  /** Callback when a data point is focused via keyboard */
  onDataPointFocus?: (_index: number, _point: ChartDataPoint) => void
}

// ──────────────────────────────────────────────────────────────
// AccessibleChart Component
// ──────────────────────────────────────────────────────────────

/**
 * Wraps any recharts chart with accessible features.
 *
 * Features:
 * - Generates a hidden HTML table from chart data for screen readers
 * - Provides alt text / trend description via aria-describedby
 * - Keyboard navigation between data points (Left/Right arrows)
 * - High contrast mode support via CSS class
 * - Proper role="img" with aria-label
 *
 * @example
 * ```tsx
 * <AccessibleChart
 *   chartId="exam-results"
 *   ariaLabel="Exam results over the past 12 months"
 *   trendDescription="Results show an upward trend from 65% in January to 89% in December"
 *   data={chartData}
 *   seriesLabels={{ average: "Average Score", passRate: "Pass Rate" }}
 * >
 *   <ResponsiveContainer>
 *     <LineChart data={rawData}>...</LineChart>
 *   </ResponsiveContainer>
 * </AccessibleChart>
 * ```
 */
function AccessibleChart({
  chartId,
  ariaLabel,
  trendDescription,
  data,
  seriesLabels,
  children,
  className,
  keyboardNav = true,
  onDataPointFocus,
}: AccessibleChartProps) {
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1)
  const [isHighContrast, setIsHighContrast] = React.useState(false)
  const descriptionId = `${chartId}-description`
  const tableId = `${chartId}-table`

  // Detect high contrast mode
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)')
    setIsHighContrast(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsHighContrast(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Keyboard navigation between data points
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!keyboardNav) return

      const totalPoints = data.length
      if (totalPoints === 0) return

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown': {
          event.preventDefault()
          const nextIndex = focusedIndex < totalPoints - 1 ? focusedIndex + 1 : 0
          setFocusedIndex(nextIndex)
          onDataPointFocus?.(nextIndex, data[nextIndex])
          break
        }
        case 'ArrowLeft':
        case 'ArrowUp': {
          event.preventDefault()
          const prevIndex = focusedIndex > 0 ? focusedIndex - 1 : totalPoints - 1
          setFocusedIndex(prevIndex)
          onDataPointFocus?.(prevIndex, data[prevIndex])
          break
        }
        case 'Home': {
          event.preventDefault()
          setFocusedIndex(0)
          onDataPointFocus?.(0, data[0])
          break
        }
        case 'End': {
          event.preventDefault()
          const lastIndex = totalPoints - 1
          setFocusedIndex(lastIndex)
          onDataPointFocus?.(lastIndex, data[lastIndex])
          break
        }
      }
    },
    [keyboardNav, data, focusedIndex, onDataPointFocus]
  )

  // Generate the series keys from the first data point if not explicitly provided
  const seriesKeys = React.useMemo(() => {
    if (data.length === 0) return []
    return Object.keys(data[0].values)
  }, [data])

  // Announce focused point for screen readers
  const focusedPointAnnouncement = React.useMemo(() => {
    if (focusedIndex < 0 || focusedIndex >= data.length) return ''
    const point = data[focusedIndex]
    const valueStrings = Object.entries(point.values)
      .map(([key, value]) => `${seriesLabels[key] || key}: ${value ?? 'N/A'}`)
      .join(', ')
    return `Data point ${focusedIndex + 1} of ${data.length}: ${point.label} — ${valueStrings}`
  }, [focusedIndex, data, seriesLabels])

  return (
    <div
      className={cn(
        'relative',
        isHighContrast && 'high-contrast-chart',
        className
      )}
    >
      {/* Visual chart with ARIA attributes */}
      <div
        role="img"
        aria-label={ariaLabel}
        aria-describedby={`${descriptionId} ${tableId}`}
        tabIndex={keyboardNav ? 0 : undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          'outline-none',
          keyboardNav && 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm'
        )}
        aria-roledescription="chart"
      >
        {children}
      </div>

      {/* Focused data point indicator for keyboard users */}
      {keyboardNav && focusedIndex >= 0 && focusedIndex < data.length && (
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          {focusedPointAnnouncement}
        </div>
      )}

      {/* Screen reader description */}
      <div id={descriptionId} className="sr-only">
        <p>{trendDescription}</p>
        {keyboardNav && (
          <p>Use arrow keys to navigate between data points. Home and End keys jump to first and last points.</p>
        )}
      </div>

      {/* Hidden data table for screen readers */}
      <VisuallyHidden>
        <div id={tableId}>
          <table aria-label={`${ariaLabel} — data table`}>
            <caption className="sr-only">
              {ariaLabel}: {trendDescription}
            </caption>
            <thead>
              <tr>
                <th scope="col">Label</th>
                {seriesKeys.map((key) => (
                  <th key={key} scope="col">
                    {seriesLabels[key] || key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((point, _index) => (
                <tr key={`${point.label}-${_index}`}>
                  <th scope="row">{point.label}</th>
                  {seriesKeys.map((key) => (
                    <td key={key}>
                      {point.values[key] !== null && point.values[key] !== undefined
                        ? String(point.values[key])
                        : 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </VisuallyHidden>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// useChartKeyboardNav — Standalone hook for chart keyboard nav
// ──────────────────────────────────────────────────────────────

interface UseChartKeyboardNavOptions {
  /** Total number of data points */
  totalPoints: number
  /** Callback when focused index changes */
  onFocus: (_index: number) => void
  /** Whether navigation is enabled */
  enabled?: boolean
}

/**
 * Standalone keyboard navigation hook for custom chart implementations.
 *
 * @example
 * ```tsx
 * const { focusedIndex, containerProps } = useChartKeyboardNav({
 *   totalPoints: data.length,
 *   onFocus: (i) => highlightPoint(i),
 * })
 * ```
 */
function useChartKeyboardNav({
  totalPoints,
  onFocus,
  enabled = true,
}: UseChartKeyboardNavOptions) {
  const [focusedIndex, setFocusedIndex] = React.useState(-1)

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled || totalPoints === 0) return

      let nextIndex = focusedIndex

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault()
          nextIndex = focusedIndex < totalPoints - 1 ? focusedIndex + 1 : 0
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault()
          nextIndex = focusedIndex > 0 ? focusedIndex - 1 : totalPoints - 1
          break
        case 'Home':
          event.preventDefault()
          nextIndex = 0
          break
        case 'End':
          event.preventDefault()
          nextIndex = totalPoints - 1
          break
        default:
          return
      }

      setFocusedIndex(nextIndex)
      onFocus(nextIndex)
    },
    [enabled, totalPoints, focusedIndex, onFocus]
  )

  const containerProps = {
    tabIndex: 0 as const,
    onKeyDown: handleKeyDown,
    'aria-activedescendant':
      focusedIndex >= 0 ? `chart-point-${focusedIndex}` : undefined,
    role: 'listbox' as const,
  }

  return { focusedIndex, setFocusedIndex, containerProps }
}

export { AccessibleChart, useChartKeyboardNav }
export type { AccessibleChartProps, ChartDataPoint }
