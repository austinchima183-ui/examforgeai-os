'use client'

import * as React from 'react'
import { Target, Trophy } from 'lucide-react'
import { SectionCard } from '@/components/system/section-card'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI OS — GoalsWidget
// ============================================================================
// Progress goals computed from REAL metrics (never fabricated): each goal
// states the current value vs. target derived from actual database counts.
// Users see exactly how far they are from the next milestone.
// ============================================================================

export interface GoalItem {
  id: string
  label: string
  /** Current real value */
  current: number
  /** Target value */
  target: number
  /** Unit rendered after values (e.g. "%", "exams") */
  unit?: string
  tone?: 'blue' | 'cyan' | 'ember' | 'emerald'
}

export interface GoalsWidgetProps {
  goals: GoalItem[]
  title?: string
  description?: string
  className?: string
  /** Content-only render (no SectionCard frame) — for embedding in WidgetGrid */
  bare?: boolean
}

const tone = {
  blue: { bar: 'bg-blue-500', text: 'text-blue-400', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.4)]' },
  cyan: { bar: 'bg-cyan-400', text: 'text-cyan-400', glow: 'shadow-[0_0_8px_rgba(34,211,238,0.4)]' },
  ember: { bar: 'bg-amber-500', text: 'text-amber-400', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.4)]' },
  emerald: { bar: 'bg-emerald-500', text: 'text-emerald-400', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.4)]' },
}

export function GoalsWidget({
  goals,
  title = 'Goals',
  description = 'Progress toward your next milestones',
  className,
  bare = false,
}: GoalsWidgetProps) {
  const content = goals.length === 0 ? (
    <EmptyState
      icon={<Target className="h-7 w-7" />}
      title="No goals yet"
      description="Goals are computed from your real activity — complete work to unlock them."
    />
  ) : (
    <ul className="space-y-4" role="list" aria-label={title}>
      {goals.map((goal) => {
            const pct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0
            const t = tone[goal.tone ?? 'blue']
            const complete = pct >= 100
            return (
              <li key={goal.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="truncate text-[12.5px] font-medium text-foreground/85">
                    {goal.label}
                  </span>
                  <span
                    className={cn('shrink-0 text-[11px] font-semibold tabular-nums', t.text)}
                  >
                    {goal.current}
                    <span className="text-foreground/35"> / {goal.target}</span>
                    {goal.unit ? <span className="text-foreground/35">{goal.unit}</span> : null}
                  </span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${goal.label}: ${pct}% complete`}
                >
                  <div
                    className={cn('h-full rounded-full transition-[width] duration-700 ease-out', t.bar, complete && t.glow)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {complete && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                    <Trophy className="h-2.5 w-2.5" aria-hidden="true" />
                    Milestone reached
                  </p>
                )}
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
      title={title}
      description={description}
      icon="target"
      tier="surface"
      className={className}
    >
      {content}
    </SectionCard>
  )
}
