'use client'

// ============================================================================
// ExamForge AI OS — Page Header Component
// ============================================================================
// Consistent page headers with: premium typography, gradient text, subtitle,
// breadcrumbs, action buttons, AI suggestion chip, and entrance animation.
// AI OS design language — no indigo, uses forge accent colors.
// ============================================================================

import React from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { Button } from './button'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderAction {
  label: string
  onClick?: () => void
  href?: string
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  icon?: React.ReactNode
  /** Is this the primary action? */
  primary?: boolean
}

export interface PageHeaderProps {
  /** Page title */
  title: string
  /** Whether to apply gradient text to the title */
  gradientTitle?: boolean
  /** Which gradient preset to use for the title */
  gradientPreset?: 'forge' | 'neural' | 'ember' | 'cool'
  /** Subtitle / description */
  description?: string
  /** Breadcrumb items (rendered above title) */
  breadcrumbs?: BreadcrumbItem[]
  /** Primary + secondary action buttons */
  actions?: PageHeaderAction[]
  /** AI suggestion chip configuration */
  aiSuggestion?: {
    label?: string
    onClick?: () => void
    /** Whether to dispatch custom event to open contextual AI */
    openContextualAI?: boolean
  }
  /** Badge/tag to show next to title */
  badge?: React.ReactNode
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to animate entrance */
  animate?: boolean
  /** Additional class name */
  className?: string
  /** Right-side custom content (replaces actions) */
  rightContent?: React.ReactNode
}

// ─── Gradient Presets (AI OS colors — no indigo) ─────────────────────────────

const gradientPresets = {
  forge: 'bg-gradient-to-r from-blue-600 to-cyan-500',
  neural: 'bg-gradient-to-r from-cyan-500 to-teal-500',
  ember: 'bg-gradient-to-r from-amber-500 to-orange-500',
  cool: 'bg-gradient-to-r from-cyan-500 to-blue-500',
} as const

const gradientPresetsDark = {
  forge: 'dark:from-blue-400 dark:to-cyan-400',
  neural: 'dark:from-cyan-400 dark:to-teal-400',
  ember: 'dark:from-amber-400 dark:to-orange-400',
  cool: 'dark:from-cyan-400 dark:to-blue-400',
} as const

// ─── Size Config ──────────────────────────────────────────────────────────────

const sizeConfig = {
  sm: {
    title: 'text-lg',
    description: 'text-sm',
    spacing: 'mb-4',
  },
  md: {
    title: 'text-2xl',
    description: 'text-sm',
    spacing: 'mb-6',
  },
  lg: {
    title: 'text-3xl',
    description: 'text-base',
    spacing: 'mb-8',
  },
} as const

// ─── Component ────────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  gradientTitle = false,
  gradientPreset = 'forge',
  description,
  breadcrumbs,
  actions,
  aiSuggestion,
  badge,
  size = 'md',
  animate = true,
  className,
  rightContent,
}: PageHeaderProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animate && !prefersReducedMotion
  const cfg = sizeConfig[size]

  // Sort actions: primary first, then others
  const sortedActions = actions
    ? [...actions].sort((a, b) => (b.primary ? 1 : 0) - (a.primary ? 1 : 0))
    : []

  const content = (
    <header className={cn('flex flex-col gap-2', cfg.spacing, className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb" className="mb-1">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="inline-flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-foreground/60" aria-hidden="true" />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium" aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}>
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Title row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1
              className={cn(
                'font-bold leading-tight tracking-tight',
                cfg.title,
                gradientTitle
                  ? cn('inline-block bg-clip-text text-transparent', gradientPresets[gradientPreset], gradientPresetsDark[gradientPreset])
                  : 'text-foreground',
              )}
            >
              {title}
            </h1>
            {badge && (
              <div className="flex-shrink-0">
                {badge}
              </div>
            )}
          </div>
          {description && (
            <p className={cn('max-w-2xl text-muted-foreground', cfg.description)}>
              {description}
            </p>
          )}
          {/* AI suggestion chip */}
          {aiSuggestion && (
            <AISuggestionChipInline
              label={aiSuggestion.label ?? 'Ask AI'}
              onClick={aiSuggestion.onClick}
              openContextualAI={aiSuggestion.openContextualAI ?? true}
            />
          )}
        </div>

        {/* Actions or custom right content */}
        {(sortedActions.length > 0 || rightContent) && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:mt-0 mt-2">
            {rightContent}
            {sortedActions.map((action, index) => (
              <Button
                key={index}
                variant={action.primary ? 'default' : (action.variant ?? 'outline')}
                size={size === 'sm' ? 'sm' : 'default'}
                onClick={action.onClick}
                asChild={!!action.href}
              >
                {action.href ? (
                  <Link href={action.href}>
                    {action.icon}
                    {action.label}
                  </Link>
                ) : (
                  <>
                    {action.icon}
                    {action.label}
                  </>
                )}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Subtle bottom separator */}
      <div aria-hidden="true" className="h-px bg-border/40 -mb-1" />
    </header>
  )

  // Wrap with entrance animation
  if (!shouldAnimate) return content

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {content}
    </motion.div>
  )
}

// ─── Inline AI Suggestion Chip ────────────────────────────────────────────────

const CONTEXTUAL_AI_OPEN_EVENT = 'examforge:contextual-ai:open'

interface AISuggestionChipInlineProps {
  label?: string
  onClick?: () => void
  openContextualAI?: boolean
}

function AISuggestionChipInline({
  label = 'Ask AI',
  onClick,
  openContextualAI = true,
}: AISuggestionChipInlineProps) {
  const prefersReducedMotion = useReducedMotion()

  const handleClick = () => {
    if (openContextualAI) {
      const event = new CustomEvent(CONTEXTUAL_AI_OPEN_EVENT, {
        bubbles: true,
        detail: { source: 'page-header', label },
      })
      window.dispatchEvent(event)
    }
    onClick?.()
  }

  const chip = (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        'bg-primary/10 text-primary transition-all duration-200',
        'hover:bg-primary/15 hover:text-primary',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
      )}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  )

  if (prefersReducedMotion) return chip

  return (
    <motion.div
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className="inline-flex mt-1"
    >
      {chip}
    </motion.div>
  )
}
