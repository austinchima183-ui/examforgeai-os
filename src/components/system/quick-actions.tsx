'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Zap, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { resolveIcon } from '@/lib/design/icon-registry'
import { SectionCard } from './section-card'
import { dashboardGrid } from '@/lib/design/system'

// ============================================================================
// ExamForge AI OS — QuickActions
// ============================================================================
// Standard quick-action grid for dashboards. Renders a row of action cards
// (icon + label + description), each clickable to navigate. Eliminates the
// duplicated quickActions array pattern in student/teacher/parent dashboards.
//
// Usage:
//   <QuickActions
//     actions={[
//       { href: '/exams/create', icon: Plus, label: 'Create Exam',
//         description: 'Build a new exam' },
//     ]}
//   />
// ============================================================================

export interface QuickAction {
  href: string
  /** RSC-safe: registry name string (e.g. "target") or LucideIcon */
  icon: string | LucideIcon
  label: string
  description?: string
  /** Optional tailwind classes for the icon tile background tint */
  color?: string
  /** Optional tailwind classes for the icon color */
  iconColor?: string
}

export interface QuickActionsProps {
  actions: QuickAction[]
  /** Number of columns on large screens (default 3) */
  cols?: 2 | 3 | 4 | 6
  /** Optional section title for the wrapping card */
  title?: string
  description?: string
  className?: string
}

const colClass: Record<NonNullable<QuickActionsProps['cols']>, string> = {
  2: 'grid gap-3 sm:grid-cols-2',
  3: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4',
  6: 'grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6',
}

export function QuickActions({
  actions,
  cols = 3,
  title,
  description,
  className,
}: QuickActionsProps) {
  const grid = (
    <div className={colClass[cols]}>
      {actions.map((action, i) => {
        const Icon = resolveIcon(action.icon) ?? Zap
        return (
        <motion.div
          key={action.href}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.35,
            delay: i * 0.04,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          <Link
            href={action.href}
            className={cn(
              'group relative flex items-start gap-3 rounded-lg p-3',
              'border border-white/[0.04] bg-white/[0.02]',
              'transition-all duration-200',
              'hover:bg-white/[0.04] hover:border-white/[0.08]',
              'hover:shadow-[0_2px_8px_rgba(59,130,246,0.08)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            )}
          >
            {/* Icon tile */}
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                'border border-white/[0.04]',
                action.color ?? 'bg-primary/10',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  action.iconColor ?? 'text-primary',
                )}
                aria-hidden="true"
              />
            </div>

            {/* Label + description */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground/90 truncate">
                {action.label}
              </p>
              {action.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {action.description}
                </p>
              )}
            </div>

            {/* Hover arrow */}
            <ArrowUpRight
              className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              aria-hidden="true"
            />
          </Link>
        </motion.div>
        )
      })}
    </div>
  )

  if (!title) {
    return <div className={className}>{grid}</div>
  }

  return (
    <SectionCard
      title={title}
      description={description}
      tier="surface"
      padding="default"
      className={className}
    >
      {grid}
    </SectionCard>
  )
}
