'use client'

import { formatDistanceToNow } from 'date-fns'
import { type LucideIcon, Inbox } from 'lucide-react'
import { resolveIcon } from '@/lib/design/icon-registry'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

// ============================================================================
// ExamForge AI — Recent Activity List (Premium)
// ============================================================================
// Displays a list of recent activity items with icon, description, and
// relative timestamp. Uses forge design system utilities with glass effects.
// ============================================================================

export interface ActivityItem {
  id: string
  icon: string | LucideIcon
  iconColor?: string
  title: string
  description: string
  timestamp: Date | string
}

export interface RecentActivityProps {
  items: ActivityItem[]
  title?: string
  className?: string
  maxHeight?: string
}

// ──────────────────────────────────────────────────────────────
// Default icon color palette
// ──────────────────────────────────────────────────────────────

const defaultIconColors = [
  'text-rose-500',
  'text-green-600 dark:text-green-400',
  'text-yellow-600 dark:text-yellow-400',
  'text-violet-500',
  'text-cyan-500',
  'text-pink-500',
]

// ──────────────────────────────────────────────────────────────
// Recent Activity Component
// ──────────────────────────────────────────────────────────────

export function RecentActivity({
  items,
  title = 'Recent Activity',
  className,
  maxHeight = 'max-h-96',
}: RecentActivityProps) {
  return (
    <Card className={cn('flex flex-col forge-glass-surface border border-white/[0.04] rounded-xl forge-card-shadow', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollArea className={cn(maxHeight, 'overflow-y-auto')}>
            <div className="flex flex-col divide-y divide-white/[0.04]">
              {items.map((item, index) => {
                const Icon = item.icon
                const iconColor =
                  item.iconColor ?? defaultIconColors[index % defaultIconColors.length]
                const timestamp =
                  typeof item.timestamp === 'string'
                    ? new Date(item.timestamp)
                    : item.timestamp

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-6 py-3 hover:bg-white/[0.02] transition-colors duration-150"
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/80 backdrop-blur-sm border border-white/[0.04]',
                        iconColor
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight truncate">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <time
                      className="shrink-0 text-[11px] font-mono text-muted-foreground whitespace-nowrap"
                      dateTime={timestamp.toISOString()}
                    >
                      {formatDistanceToNow(timestamp, { addSuffix: true })}
                    </time>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

// ──────────────────────────────────────────────────────────────
// Empty State (Premium)
// ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/80 backdrop-blur-sm border border-white/[0.04]">
          <Inbox className="h-6 w-6 text-foreground/60" />
        </div>
      </div>
      <p className="text-base font-medium text-foreground">No recent activity</p>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-xs text-center">
        Activity will appear here as you use the platform.
      </p>
    </div>
  )
}
