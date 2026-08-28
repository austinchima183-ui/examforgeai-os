'use client'

import * as React from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Sparkles, ExternalLink, ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI OS — Premium Empty State Component
// ============================================================================
// AI OS design language: glass effect, electric blue glow, staggered animation,
// AI suggestion chip, and full a11y support. No indigo — uses forge accent.
// ============================================================================

// --- Types -------------------------------------------------------------------

interface EmptyStateAction {
  label: string
  href?: string
  onClick?: () => void
  icon?: React.ReactNode
}

interface AiSuggestion {
  text: string
  onClick?: () => void
}

interface HelpLink {
  label: string
  href: string
}

interface EmptyStateProps extends Omit<HTMLMotionProps<'div'>, 'title'> {
  /** Hero icon — rendered inside a glowing container */
  icon?: React.ReactNode
  /** Heading — becomes the ARIA label for the region */
  title: string
  /** Supporting copy rendered below the heading */
  description: string
  /** Primary CTA — renders as a filled Button */
  primaryAction?: EmptyStateAction
  /** Secondary CTA — renders as an outline Button */
  secondaryAction?: EmptyStateAction
  /** When provided, shows an "AI Suggestion" chip with a Sparkles icon */
  aiSuggestion?: AiSuggestion
  /** External help / docs link rendered at the bottom */
  helpLink?: HelpLink
  /** Additional class names forwarded to the root element */
  className?: string
}

// --- Animation presets -------------------------------------------------------

const stagger = (delay: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
})

// --- Component ---------------------------------------------------------------

function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  aiSuggestion,
  helpLink,
  className,
  ...motionProps
}: EmptyStateProps) {
  const hasActions = Boolean(primaryAction || secondaryAction)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
      role="region"
      aria-label={title}
      aria-roledescription="empty state"
      className={cn(
        // Layout
        'relative overflow-hidden rounded-2xl border border-border/60',
        // Glass surface
        'forge-glass-surface',
        className,
      )}
      {...motionProps}
    >
      {/* Top-edge gradient accent line */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
      />

      <div className="flex flex-col items-center justify-center px-6 py-14 text-center sm:px-10 sm:py-16">
        {/* ---- Icon with forge glow ---- */}
        {icon && (
          <motion.div
            {...stagger(0.08)}
            className="relative mb-6"
          >
            {/* Outer soft glow — electric blue */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-primary/15 blur-2xl scale-[2]"
            />
            {/* Icon container — glass effect */}
            <div
              className={cn(
                'relative flex h-16 w-16 items-center justify-center rounded-2xl',
                'bg-primary/10 text-primary',
                'ring-1 ring-primary/20',
                'shadow-sm shadow-primary/10',
              )}
            >
              {icon}
            </div>
          </motion.div>
        )}

        {/* ---- Title ---- */}
        <motion.h3
          {...stagger(0.14)}
          className="text-lg font-semibold tracking-tight text-foreground sm:text-xl"
        >
          {title}
        </motion.h3>

        {/* ---- Description ---- */}
        <motion.p
          {...stagger(0.2)}
          className="mt-2.5 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-[0.8125rem]"
        >
          {description}
        </motion.p>

        {/* ---- Action buttons ---- */}
        {hasActions && (
          <motion.div
            {...stagger(0.28)}
            className="mt-7 flex flex-col items-center gap-3 sm:flex-row"
          >
            {primaryAction && (
              primaryAction.href ? (
                <Button asChild className="gap-2 min-w-[140px]">
                  <Link
                    href={primaryAction.href}
                    aria-label={primaryAction.label}
                  >
                    {primaryAction.icon}
                    {primaryAction.label}
                    <ArrowRight className="h-4 w-4 opacity-70" aria-hidden="true" />
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={primaryAction.onClick}
                  className="gap-2 min-w-[140px]"
                  aria-label={primaryAction.label}
                >
                  {primaryAction.icon}
                  {primaryAction.label}
                  <ArrowRight className="h-4 w-4 opacity-70" aria-hidden="true" />
                </Button>
              )
            )}
            {secondaryAction && (
              secondaryAction.href ? (
                <Button asChild variant="outline" className="gap-2">
                  <Link
                    href={secondaryAction.href}
                    aria-label={secondaryAction.label}
                  >
                    {secondaryAction.icon}
                    {secondaryAction.label}
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={secondaryAction.onClick}
                  className="gap-2"
                  aria-label={secondaryAction.label}
                >
                  {secondaryAction.icon}
                  {secondaryAction.label}
                </Button>
              )
            )}
          </motion.div>
        )}

        {/* ---- AI Suggestion chip ---- */}
        {aiSuggestion && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.38, duration: 0.3, ease: 'easeOut' }}
            className="mt-6"
          >
            <button
              type="button"
              onClick={aiSuggestion.onClick}
              aria-label={`AI suggestion: ${aiSuggestion.text}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-1.5',
                'text-xs font-medium',
                'border border-primary/20 bg-primary/10 text-primary',
                'transition-all duration-200',
                'hover:border-primary/30 hover:bg-primary/15 hover:shadow-sm hover:shadow-primary/10',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
              )}
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {aiSuggestion.text}
            </button>
          </motion.div>
        )}

        {/* ---- Help link ---- */}
        {helpLink && (
          <motion.div
            {...stagger(0.44)}
            className="mt-5"
          >
            <Link
              href={helpLink.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${helpLink.label} — opens in a new tab`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm text-xs',
                'text-muted-foreground underline-offset-4',
                'transition-colors duration-150',
                'hover:text-foreground hover:underline',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
              )}
            >
              {helpLink.label}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            </Link>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export { EmptyState, type EmptyStateProps, type EmptyStateAction, type AiSuggestion, type HelpLink }
