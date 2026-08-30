'use client'

import * as React from 'react'
import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { PageHeader, type PageHeaderProps } from './page-header'

// ============================================================================
// ExamForge AI OS — DashboardPage (UX 2.0)
// ============================================================================
// Top-level scaffold for dashboard pages. Composes:
// - STICKY TOOLBAR BAND: page header (title + description + badge + actions)
//   sticks to the top of the main scroll region — title, breadcrumbs and
//   page actions stay visible while content scrolls beneath. The band's
//   measured height is published as the CSS variable --page-toolbar-h so
//   downstream sticky bars (filter bars, table toolbars) can stack below it.
// - Optional KPI strip slot
// - Main content area (children)
// - Optional right-rail sidebar slot
// - Staggered entrance animation (respects reduced motion)
//
// Scroll architecture: this page renders INSIDE the app shell's main scroll
// container (p-4 sm:p-6 lg:p-8). The sticky band compensates with negative
// horizontal margins so its glass backdrop spans edge-to-edge.
// ============================================================================

export interface DashboardPageProps extends Omit<PageHeaderProps, 'title'> {
  /** Page title */
  title: React.ReactNode
  /** Optional KPI strip — rendered full-width above the main content */
  kpis?: React.ReactNode
  /** Optional right rail — rendered as a sidebar on lg+ screens */
  sidebar?: React.ReactNode
  /** When sidebar is set, controls the main content width (default 2/3) */
  mainSpan?: 1 | 2
  /** When sidebar is set, controls the sidebar width (default 1/3) */
  sidebarSpan?: 1 | 2
  /** Spacing between sections — defaults to "space-y-8" */
  spacing?: 'sm' | 'default' | 'lg'
  /** Whether to animate entrance (default true) */
  animate?: boolean
  /** Sticky toolbar offset publishing: enables stacked sticky bars downstream */
  stickyToolbar?: boolean
  className?: string
  children?: React.ReactNode
}

const spacingMap: Record<NonNullable<DashboardPageProps['spacing']>, string> = {
  sm: 'gap-6',
  default: 'gap-8',
  lg: 'gap-10',
}

export function DashboardPage({
  title,
  kpis,
  sidebar,
  mainSpan = 2,
  sidebarSpan = 1,
  spacing = 'default',
  animate = true,
  stickyToolbar = true,
  className,
  children,
  ...headerProps
}: DashboardPageProps) {
  const hasSidebar = Boolean(sidebar)
  const bandRef = useRef<HTMLDivElement>(null)

  // Map span to grid column classes — using lg:grid-cols-3 as base
  const mainColClass = hasSidebar
    ? mainSpan === 2
      ? 'lg:col-span-2'
      : 'lg:col-span-1'
    : ''
  const sideColClass = hasSidebar
    ? sidebarSpan === 1
      ? 'lg:col-span-1'
      : 'lg:col-span-2'
    : ''

  // ── Publish the sticky toolbar height as a CSS variable ──
  // Downstream sticky elements (FilterBar, table toolbars) use:
  //   top: calc(var(--page-toolbar-h, 84px) + 0.5rem)
  // so they stack neatly below the page header band.
  useEffect(() => {
    if (!stickyToolbar) return
    const el = bandRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const publish = () => {
      document.documentElement.style.setProperty(
        '--page-toolbar-h',
        `${el.offsetHeight}px`
      )
    }
    publish()
    const ro = new ResizeObserver(publish)
    ro.observe(el)
    return () => {
      ro.disconnect()
    }
  }, [stickyToolbar])

  const headerBand = (
    <div
      ref={bandRef}
      className={cn(
        'sticky top-0 z-20',
        // Bleed the glass band edge-to-edge across the main scroll padding
        '-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8',
        'py-4',
        'border-b border-white/[0.05] bg-[#090909]/78 backdrop-blur-xl',
        // Hide the sticky band entirely when printing
        'print:static print:bg-transparent print:backdrop-blur-none'
      )}
    >
      <PageHeader title={title} animate={false} {...headerProps} />
    </div>
  )

  const content = (
    <div className={cn('flex flex-col', spacingMap[spacing], className)}>
      {stickyToolbar ? (
        headerBand
      ) : (
        <div className="pt-1">
          <PageHeader title={title} animate={animate} {...headerProps} />
        </div>
      )}

      {kpis && <div className="min-w-0">{kpis}</div>}

      {hasSidebar ? (
        <div className="grid min-w-0 gap-4 lg:grid-cols-3">
          <div className={cn(mainColClass, 'flex min-w-0 flex-col gap-8')}>{children}</div>
          <aside className={cn(sideColClass, 'flex min-w-0 flex-col gap-4')}>{sidebar}</aside>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-8">{children}</div>
      )}
    </div>
  )

  if (!animate) return content

  // CSS-driven entrance — runs at first paint, not gated on React hydration.
  return (
    <div className="animate-in fade-in duration-300 motion-reduce:animate-none">
      {content}
    </div>
  )
}
