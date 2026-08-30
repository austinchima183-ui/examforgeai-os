'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { resolveIcon } from '@/lib/design/icon-registry'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// ExamForge AI OS — PageHeader
// ============================================================================
// Standard dashboard page header. Renders:
// - Optional breadcrumb trail (with chevron separators)
// - Page title (h1) + subtitle
// - Optional role/status badge
// - Optional actions slot (buttons, filters)
// - Entrance animation (fade-in-up)
//
// Designed to be the FIRST element inside every dashboard page. Eliminates
// the duplicated "flex flex-col sm:flex-row sm:items-center sm:justify-between"
// pattern that appears in every dashboard.
// ============================================================================

export interface PageHeaderBreadcrumb {
  label: string
  href?: string
}

export interface PageHeaderProps {
  /** Page title — becomes h1 */
  title: React.ReactNode
  /** Subtitle / description — muted, sits below the title */
  description?: React.ReactNode
  /** Optional breadcrumbs — rendered above the title with chevron separators */
  breadcrumbs?: PageHeaderBreadcrumb[]
  /** Optional badge — rendered next to the title (e.g. role badge) */
  badge?: {
    label: string
    /** RSC-safe: registry name string (e.g. "graduation-cap") or LucideIcon */
    icon?: string | LucideIcon
    /** Tailwind classes for the badge (defaults to neural/cyan tone) */
    className?: string
  }
  /** Optional right-aligned actions (buttons, filter triggers, etc.) */
  actions?: React.ReactNode
  /** Greeting prefix — when set, prepended to title (e.g. "Good morning, Jane") */
  greeting?: string
  /** Additional className on the root */
  className?: string
  /** Whether to animate entrance (default true) */
  animate?: boolean
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  badge,
  actions,
  greeting,
  className,
  animate = true,
}: PageHeaderProps) {
  const titleNode = (
    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
      {greeting ? (
        <>
          {greeting}, <span className="forge-gradient-text">{title}</span>
        </>
      ) : (
        title
      )}
    </h1>
  )

  const descriptionNode = description ? (
    <p className="text-sm text-muted-foreground mt-1.5">{description}</p>
  ) : null

  const badgeNode = badge ? (
    <Badge
      variant="secondary"
      className={cn(
        'w-fit text-[11px] px-2 py-0.5',
        'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400 border-cyan-500/20',
        badge.className,
      )}
    >
      {(() => {
        const BadgeIcon = resolveIcon(badge.icon)
        return BadgeIcon ? <BadgeIcon className="h-3 w-3 mr-1" /> : null
      })()}
      {badge.label}
    </Badge>
  ) : null

  const breadcrumbsNode = breadcrumbs && breadcrumbs.length > 0 && (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-xs text-muted-foreground mb-2"
    >
      {breadcrumbs.map((crumb, i) => {
        const isLast = i === breadcrumbs.length - 1
        return (
          <React.Fragment key={i}>
            {crumb.href && !isLast ? (
              <Link
                href={crumb.href}
                className="hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-foreground/70' : ''}>
                {crumb.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )

  const inner = (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        {breadcrumbsNode}
        <div className="flex items-center gap-3 flex-wrap">
          {titleNode}
          {badgeNode}
        </div>
        {descriptionNode}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  )

  if (!animate) return inner

  // CSS-driven entrance — paints from SSR HTML without waiting for hydration.
  return (
    <div className="animate-in fade-in slide-in-from-top-1 duration-350 motion-reduce:animate-none motion-reduce:transform-none">
      {inner}
    </div>
  )
}
