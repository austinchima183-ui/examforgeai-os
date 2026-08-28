'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { GlassTier } from '@/lib/design/system'
import { glassTiers } from '@/lib/design/system'
import { resolveIcon } from '@/lib/design/icon-registry'

// ============================================================================
// ExamForge AI OS — SectionCard
// ============================================================================
// Standard card for dashboard sections. Renders:
// - Optional header (icon + title + description + action)
// - Body (children) with configurable padding
// - Glass tier system (surface / elevated / floating / void)
// - Optional entrance animation with stagger
//
// Replaces the duplicated Card + CardHeader + CardTitle + CardDescription
// + actions pattern in every dashboard.
//
// Usage:
//   <SectionCard
//     title="Recent Activity"
//     description="Latest events across your workspace"
//     action={<Button size="sm">View all</Button>}
//   >
//     ...content...
//   </SectionCard>
// ============================================================================

export interface SectionCardProps {
  title?: React.ReactNode
  description?: React.ReactNode
  /** Optional icon next to the title — RSC-safe: registry name string or component */
  icon?: string | React.ComponentType<{ className?: string }>
  /** Optional right-aligned actions (buttons, badges, links) */
  action?: React.ReactNode
  /** Glass tier — defaults to surface (subtle glass) */
  tier?: GlassTier
  /** Inner padding — default "default" (p-6) */
  padding?: 'none' | 'sm' | 'default' | 'lg'
  /** Whether to animate entrance (default false — set true when needed) */
  animate?: boolean
  /** Optional stagger index for entrance animation */
  index?: number
  className?: string
  contentClassName?: string
  children?: React.ReactNode
  /** Accessible label — when title is omitted, this is required */
  ariaLabel?: string
}

const paddingMap: Record<NonNullable<SectionCardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-4',
  default: 'p-6',
  lg: 'p-8',
}

export function SectionCard({
  title,
  description,
  icon,
  action,
  tier = 'surface',
  padding = 'default',
  animate = false,
  index = 0,
  className,
  contentClassName,
  children,
  ariaLabel,
}: SectionCardProps) {
  const glass = glassTiers[tier]
  const Icon = resolveIcon(icon)
  const hasHeader = Boolean(title || description || action || Icon)

  const card = (
    <section
      aria-label={!title ? ariaLabel : undefined}
      className={cn(
        'relative overflow-hidden rounded-xl',
        'flex flex-col gap-4',
        glass.bg,
        glass.border,
        glass.shadow,
        'transition-all duration-300',
        'hover:border-white/[0.06]',
        className,
      )}
    >
      {hasHeader && (
        <header className="flex flex-row items-start justify-between gap-3 px-6 pt-6">
          <div className="flex items-start gap-2.5 min-w-0">
            {Icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.04]">
                <Icon className="h-4 w-4 text-foreground/70" />
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold text-foreground leading-tight">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          </div>
          {action && (
            <div className="shrink-0 flex items-center gap-2">{action}</div>
          )}
        </header>
      )}
      <div
        className={cn(
          hasHeader ? cn(paddingMap[padding].replace('p-', 'px-6 pb-6 ')) : paddingMap[padding],
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  )

  if (!animate) return card

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {card}
    </motion.div>
  )
}
