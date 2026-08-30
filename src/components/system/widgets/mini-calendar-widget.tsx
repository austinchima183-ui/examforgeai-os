'use client'

import * as React from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { SectionCard } from '@/components/system/section-card'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI OS — MiniCalendarWidget
// ============================================================================
// Compact month calendar with real event markers. Days that carry real
// events (exams, school calendar events) are highlighted; clicking a day
// with events scrolls to / highlights the event list beneath. Fully
// keyboard-accessible (arrow keys move the focused day).
// ============================================================================

export interface CalendarDayEvent {
  id: string
  title: string
  /** ISO date (YYYY-MM-DD) */
  date: string
  /** Visual tone for the marker */
  tone?: 'blue' | 'cyan' | 'ember' | 'emerald' | 'violet'
}

export interface MiniCalendarWidgetProps {
  /** Real events keyed by date */
  events: CalendarDayEvent[]
  title?: string
  className?: string
  /** Content-only render (no SectionCard frame) — for embedding in WidgetGrid */
  bare?: boolean
}

const toneBg: Record<NonNullable<CalendarDayEvent['tone']>, string> = {
  blue: 'bg-blue-400',
  cyan: 'bg-cyan-400',
  ember: 'bg-amber-400',
  emerald: 'bg-emerald-400',
  violet: 'bg-violet-400',
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function MiniCalendarWidget({
  events,
  title = 'Calendar',
  className,
  bare = false,
}: MiniCalendarWidgetProps) {
  const today = new Date()
  const [viewYear, setViewYear] = React.useState(today.getFullYear())
  const [viewMonth, setViewMonth] = React.useState(today.getMonth()) // 0-indexed
  const [selectedDay, setSelectedDay] = React.useState<string | null>(toISODate(today))

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarDayEvent[]>()
    for (const event of events) {
      const key = event.date.slice(0, 10)
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    return map
  }, [events])

  // Build the 6x7 grid for the viewed month (Monday-first)
  const days = React.useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1)
    const startOffset = (firstOfMonth.getDay() + 6) % 7 // Monday = 0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
    const cells: Array<{ date: Date | null }> = []
    for (let i = 0; i < startOffset; i++) cells.push({ date: null })
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(viewYear, viewMonth, day) })
    }
    while (cells.length % 7 !== 0) cells.push({ date: null })
    return cells
  }, [viewYear, viewMonth])

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const selectedEvents = selectedDay ? eventsByDate.get(selectedDay) ?? [] : []

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const monthNav = (
    <div className="flex items-center gap-1">
      <button
        onClick={prevMonth}
        className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/40 transition-colors hover:bg-white/[0.04] hover:text-foreground/70"
        aria-label="Previous month"
      >
        <span aria-hidden="true" className="text-xs">‹</span>
      </button>
      <button
        onClick={nextMonth}
        className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/40 transition-colors hover:bg-white/[0.04] hover:text-foreground/70"
        aria-label="Next month"
      >
        <span aria-hidden="true" className="text-xs">›</span>
      </button>
    </div>
  )

  const content = (
    <>
      <div role="grid" aria-label={`${monthLabel} calendar`} className="select-none">
        <div role="row" className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day, i) => (
            <div
              key={i}
              role="columnheader"
              className="text-center text-[10px] font-medium uppercase tracking-wider text-foreground/30"
            >
              {day}
            </div>
          ))}
        </div>
        <div role="row" className="grid grid-cols-7 gap-1">
          {days.map((cell, index) => {
            if (!cell.date) {
              return <div key={index} role="gridcell" aria-hidden="true" />
            }
            const iso = toISODate(cell.date)
            const dayEvents = eventsByDate.get(iso) ?? []
            const isToday = iso === toISODate(today)
            const isSelected = iso === selectedDay
            return (
              <button
                key={index}
                role="gridcell"
                aria-selected={isSelected}
                aria-label={`${cell.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}${dayEvents.length > 0 ? `, ${dayEvents.length} events` : ''}`}
                onClick={() => setSelectedDay(iso)}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-md text-[11px] tabular-nums transition-all duration-150',
                  'hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400/40',
                  isToday
                    ? 'font-bold text-foreground ring-1 ring-inset ring-blue-400/40'
                    : 'text-foreground/55',
                  isSelected && 'bg-blue-500/15 text-blue-300',
                  dayEvents.length > 0 && !isSelected && 'font-semibold text-foreground/80'
                )}
              >
                {cell.date.getDate()}
                {dayEvents.length > 0 && (
                  <span className="absolute bottom-1 flex items-center gap-0.5" aria-hidden="true">
                    {dayEvents.slice(0, 3).map((event, i) => (
                      <span
                        key={event.id}
                        className={cn('h-1 w-1 rounded-full', toneBg[event.tone ?? 'blue'])}
                      />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected-day events */}
      <div className="mt-4 border-t border-white/[0.04] pt-3">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-foreground/40">
          {selectedDay
            ? new Date(`${selectedDay}T00:00:00`).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })
            : 'Select a day'}
        </p>
        {selectedEvents.length === 0 ? (
          <p className="flex items-center gap-2 py-1 text-[12px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-foreground/25" aria-hidden="true" />
            No events on this day
          </p>
        ) : (
          <ul className="space-y-1.5" role="list">
            {selectedEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-center gap-2.5 rounded-lg bg-white/[0.02] px-2.5 py-2"
              >
                <span
                  className={cn('h-1.5 w-1.5 shrink-0 rounded-full', toneBg[event.tone ?? 'blue'])}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/80">
                  {event.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )

  if (bare) {
    return (
      <div className={className}>
        <div className="mb-2 flex items-center justify-end gap-2">
          <span className="text-[11px] text-muted-foreground">{monthLabel}</span>
          {monthNav}
        </div>
        {content}
      </div>
    )
  }

  return (
    <SectionCard
      title={title}
      description={monthLabel}
      icon="calendar-days"
      tier="surface"
      className={className}
      action={monthNav}
    >
      {content}
    </SectionCard>
  )
}

// ──────────────────────────────────────────────────────────────
// AnnouncementsWidget — school calendar events feed
// ──────────────────────────────────────────────────────────────

export interface AnnouncementItem {
  id: string
  title: string
  description?: string
  event_type: string
  start_date: string
}

export function AnnouncementsWidget({
  announcements,
  className,
  bare = false,
}: {
  announcements: AnnouncementItem[]
  className?: string
  /** Content-only render (no SectionCard frame) — for embedding in WidgetGrid */
  bare?: boolean
}) {
  const content = announcements.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-7 w-7" />}
          title="No announcements"
          description="School-wide announcements and events will appear here."
        />
      ) : (
        <ul className="space-y-2" role="list" aria-label="Announcements">
          {announcements.slice(0, 5).map((item) => {
            const date = new Date(`${item.start_date.slice(0, 10)}T00:00:00`)
            return (
              <li
                key={item.id}
                className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-blue-400/20 bg-blue-500/10">
                  <span className="text-[9px] font-semibold uppercase text-blue-300">
                    {date.toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="text-[13px] font-bold leading-none text-blue-200 tabular-nums">
                    {date.getDate()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-foreground/85">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[10.5px] capitalize text-muted-foreground">
                    {item.event_type.replace(/_/g, ' ')}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
  )

  if (bare) {
    return <div className={className}>{content}</div>
  }

  return (
    <SectionCard
      title="Announcements"
      description="School notices & events"
      icon="megaphone"
      tier="surface"
      className={className}
    >
      {content}
    </SectionCard>
  )
}
