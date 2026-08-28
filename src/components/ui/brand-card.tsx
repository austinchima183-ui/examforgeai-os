'use client'

// ============================================================================
// ExamForge AI — Premium Branded Card Component
// ============================================================================
// A premium card using ExamForge design tokens. Features subtle gradient
// border on hover, smooth shadow transitions, optional header/footer, and
// a "glow" variant with indigo accent. Framer Motion hover/tap animations.
// ============================================================================

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { shadows, borderRadius } from '@/lib/design/tokens'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrandCardProps {
  /** Card variant */
  variant?: 'default' | 'premium' | 'glow' | 'outline' | 'flat'
  /** Optional header with icon and title */
  header?: {
    icon?: React.ReactNode
    title: string
    description?: string
    actions?: React.ReactNode
  }
  /** Optional footer with actions */
  footer?: {
    content?: React.ReactNode
    actions?: React.ReactNode
  }
  /** Card content */
  children: React.ReactNode
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg' | 'none'
  /** Whether to animate on hover */
  animate?: boolean
  /** Additional class name */
  className?: string
  /** Click handler (makes card clickable) */
  onClick?: () => void
  /** HTML element to render as */
  as?: 'div' | 'article' | 'section'
}

// ─── Variant Styles ───────────────────────────────────────────────────────────

const variantStyles = {
  default: cn(
    'bg-card text-card-foreground border border-border',
    'shadow-sm hover:shadow-md',
  ),
  premium: cn(
    'bg-card text-card-foreground border border-border',
    'shadow-md hover:shadow-lg',
    // Gradient border effect via background + pseudo-element
    'relative overflow-hidden',
  ),
  glow: cn(
    'bg-card text-card-foreground border border-indigo-200/60',
    'dark:border-indigo-800/40',
    'shadow-lg',
  ),
  outline: cn(
    'bg-transparent text-card-foreground border-2 border-border',
    'hover:border-indigo-300 dark:hover:border-indigo-700',
  ),
  flat: cn(
    'bg-card text-card-foreground',
    'shadow-none border-none',
  ),
} as const

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const

// ─── Component ────────────────────────────────────────────────────────────────

export function BrandCard({
  variant = 'default',
  header,
  footer,
  children,
  padding = 'md',
  animate = true,
  className,
  onClick,
  as: Component = 'div',
}: BrandCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animate && !prefersReducedMotion
  const isClickable = !!onClick

  const cardContent = (
    <Component
      className={cn(
        'relative flex flex-col gap-0 rounded-xl transition-all duration-300',
        variantStyles[variant],
        isClickable && 'cursor-pointer',
        className,
      )}
      style={{
        borderRadius: `${borderRadius.lg}px`,
      }}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {/* Premium gradient border overlay */}
      {variant === 'premium' && (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300',
            'bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-purple-500/10',
            'group-hover:opacity-100',
          )}
          aria-hidden="true"
        />
      )}

      {/* Glow variant — subtle inner glow */}
      {variant === 'glow' && (
        <>
          <div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-50"
            style={{ boxShadow: shadows.glow }}
            aria-hidden="true"
          />
          <div
            className={cn(
              'pointer-events-none absolute inset-[1px] rounded-xl',
              'bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5',
            )}
            aria-hidden="true"
          />
        </>
      )}

      {/* Header */}
      {header && (
        <div
          className={cn(
            'flex items-start justify-between gap-3',
            'border-b border-border/50 pb-4',
            padding !== 'none' ? 'px-6 pt-6' : 'px-4 pt-4',
          )}
        >
          <div className="flex items-start gap-3">
            {header.icon && (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
                {header.icon}
              </div>
            )}
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold leading-tight text-foreground">
                {header.title}
              </h3>
              {header.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {header.description}
                </p>
              )}
            </div>
          </div>
          {header.actions && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {header.actions}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className={cn(
        'flex-1',
        header && footer ? '' : header ? 'pt-0' : '',
        paddingStyles[padding],
        // Adjust padding when header/footer exist
        header && padding === 'md' && 'pt-4 pb-4',
        header && padding === 'lg' && 'pt-5 pb-5',
        header && padding === 'sm' && 'pt-3 pb-3',
      )}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div
          className={cn(
            'flex items-center justify-between gap-3',
            'border-t border-border/50 pt-4',
            padding !== 'none' ? 'px-6 pb-6' : 'px-4 pb-4',
          )}
        >
          {footer.content && (
            <div className="text-xs text-muted-foreground">
              {footer.content}
            </div>
          )}
          {footer.actions && (
            <div className="flex items-center gap-2 ml-auto">
              {footer.actions}
            </div>
          )}
        </div>
      )}
    </Component>
  )

  // Wrap with Framer Motion for hover/tap if animated
  if (!shouldAnimate) {
    return (
      <div className="group">
        {cardContent}
      </div>
    )
  }

  return (
    <motion.div
      className="group"
      whileHover={{
        y: -2,
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
    >
      {cardContent}
    </motion.div>
  )
}

// ─── Convenience sub-components ───────────────────────────────────────────────

export function BrandCardHeader({
  icon: _icon,
  title: _title,
  description: _description,
  actions: _actions,
}: NonNullable<BrandCardProps['header']> & { icon?: React.ReactNode }) {
  void _icon; void _title; void _description; void _actions
  return null // Used inline in BrandCard — this is a type helper
}

export function BrandCardFooter({
  content: _content,
  actions: _actions,
}: NonNullable<BrandCardProps['footer']> & { content?: React.ReactNode }) {
  void _content; void _actions
  return null // Used inline in BrandCard — this is a type helper
}
