'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarClock, CircleDot, ArrowRight } from 'lucide-react'
import { SectionCard } from '@/components/system/section-card'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI OS — UpcomingTasksWidget
// ============================================================================
// Real action items derived from live data (upcoming exams, pending grading).
// Each item links to the real destination. Countdown chips are computed from
// real timestamps. Long lists scroll internally — no page-level overflow.
// ============================================================================

export interface TaskItem {
  id: string
  title: string
  /** ISO timestamp or null */
  dueAt: string | null
  /** Link to the real destination */
  href: string
  meta?: string
  /** Visual tone */
  tone?: 'blue' | 'cyan' | 'ember' | 'emerald'
}

export interface UpcomingTasksWidgetProps {
  tasks: TaskItem[]
  loading?: boolean
  title?: string
  description?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: { label: string; href: string }
  /** Max height before internal scrolling (px) */
  maxHeight?: number
  className?: string
}

const toneDot: Record<NonNullable<TaskItem['tone']>, string> = {
  blue: 'bg-blue-400',
  cyan: 'bg-cyan-400',
  ember: 'bg-amber-400',
  emerald: 'bg-emerald-400',
}

function formatCountdown(iso: string | null): { label: string; urgent: boolean } | null {
  if (!iso) return null
  const due = new Date(iso).getTime()
  if (Number.isNaN(due)) return null
  const diff = due - Date.now()
  if (diff < 0) return { label: 'Overdue', urgent: true }
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return { label: '<1 hour', urgent: true }
  if (hours < 24) return { label: `${hours}h`, urgent: hours < 4 }
  const days = Math.floor(hours / 24)
  if (days < 7) return { label: `${days}d`, urgent: false }
  const weeks = Math.floor(days / 7)
  return { label: `${weeks}w`, urgent: false }
}

function formatDueDate(iso: string | null): string {
  if (!iso) return 'Unscheduled'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function UpcomingTasksWidget({
  tasks,
  loading = false,
  title = 'Upcoming',
  description,
  emptyTitle = 'Nothing scheduled',
  emptyDescription = 'You have no upcoming deadlines. New items appear here automatically.',
  emptyAction,
  maxHeight = 320,
  className,
}: UpcomingTasksWidgetProps) {
  return (
    <SectionCard
      title={title}
      description={description}
      icon="clipboard-list"
      tier="surface"
      className={className}
      action={
        tasks.length > 0 ? (
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            {tasks.length} scheduled
          </span>
        ) : undefined
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-7 w-7" />}
          title={emptyTitle}
          description={emptyDescription}
          primaryAction={emptyAction}
        />
      ) : (
        <ul
          className="scrollbar-thin -mx-1 space-y-1 overflow-y-auto px-1"
          style={{ maxHeight }}
          role="list"
          aria-label={title}
        >
          {tasks.map((task) => {
            const countdown = formatCountdown(task.dueAt)
            return (
              <li key={task.id}>
                <Link
                  href={task.href}
                  className="group flex items-center gap-3 rounded-lg border border-transparent px-2.5 py-2.5 transition-all duration-200 hover:border-white/[0.06] hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400/40"
                >
                  <span
                    className={cn(
                      'mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full',
                      toneDot[task.tone ?? 'blue']
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground/85 transition-colors group-hover:text-foreground">
                      {task.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <CalendarClock className="h-3 w-3" aria-hidden="true" />
                      {formatDueDate(task.dueAt)}
                      {task.meta && (
                        <>
                          <CircleDot className="h-2.5 w-2.5" aria-hidden="true" />
                          {task.meta}
                        </>
                      )}
                    </p>
                  </div>
                  {countdown && (
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums',
                        countdown.urgent
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-white/[0.04] text-foreground/50'
                      )}
                      aria-label={`Due in ${countdown.label}`}
                    >
                      {countdown.label}
                    </span>
                  )}
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 -translate-x-1 text-foreground/25 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
