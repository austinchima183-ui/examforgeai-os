'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  activityTypeConfig,
  formatRelativeTime,
  type ActivityType,
} from '@/lib/design/system'

// ============================================================================
// ExamForge AI OS — ActivityFeed
// ============================================================================
// Standard recent-activity stream. Renders:
// - Vertical timeline of activity items
// - Each item: type icon (colored tile) + title + time-ago + optional description
// - Empty state with optional CTA
// - Staggered entrance animation
//
// Replaces the duplicated activity-card markup in student/teacher/parent
// dashboards. The canonical activity type → color mapping lives in
// lib/design/system.ts (activityTypeConfig).
// ============================================================================

export interface ActivityFeedItem {
  id: string
  type: ActivityType | string
  title: string
  description?: string
  timestamp: string | Date
  href?: string
}

export interface ActivityFeedProps {
  items: ActivityFeedItem[]
  /** Optional empty state — renders when items is empty */
  emptyState?: React.ReactNode
  /** Max items to show (defaults to all) */
  maxItems?: number
  /** Stagger entrance animation (default true) */
  animate?: boolean
  className?: string
  /** Optional "View all" link rendered at the bottom */
  viewAllHref?: string
  viewAllLabel?: string
}

function getActivityConfig(type: string) {
  return (
    activityTypeConfig[type as ActivityType] ?? activityTypeConfig.default
  )
}

export function ActivityFeed({
  items,
  emptyState,
  maxItems,
  animate = true,
  className,
  viewAllHref,
  viewAllLabel = 'View all activity',
}: ActivityFeedProps) {
  const visibleItems = maxItems ? items.slice(0, maxItems) : items

  if (visibleItems.length === 0 && emptyState) {
    return <div className={cn('py-8', className)}>{emptyState}</div>
  }

  return (
    <ul className={cn('space-y-3', className)} role="list">
      {visibleItems.map((item, i) => {
        const config = getActivityConfig(item.type)
        const time = formatRelativeTime(item.timestamp)
        const Content = item.href ? 'a' : 'div'
        return (
          <motion.li
            key={item.id}
            initial={animate ? { opacity: 0, x: -8 } : false}
            animate={animate ? { opacity: 1, x: 0 } : undefined}
            transition={{
              duration: 0.3,
              delay: i * 0.04,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <Content
              {...(item.href ? { href: item.href } : {})}
              className={cn(
                'flex items-start gap-3 rounded-lg p-2 -mx-2',
                'transition-colors duration-200',
                item.href && 'hover:bg-white/[0.03] cursor-pointer',
              )}
            >
              {/* Type icon tile */}
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  'border border-white/[0.04]',
                  config.bg,
                )}
                aria-hidden="true"
              >
                <ActivityDot className={cn('h-3 w-3', config.icon)} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground/90 leading-tight truncate">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  {time}
                </p>
              </div>
            </Content>
          </motion.li>
        )
      })}

      {viewAllHref && (
        <li className="pt-2">
          <a
            href={viewAllHref}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {viewAllLabel} →
          </a>
        </li>
      )}
    </ul>
  )
}

// Tiny dot icon — the canonical icon for activity feed items. The tile's
// color encodes the activity type, so we don't ship a Lucide icon per type.
function ActivityDot({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block rounded-full', className)}
      style={{ width: '0.5em', height: '0.5em' }}
    />
  )
}
