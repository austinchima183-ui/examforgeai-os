'use client'

// ============================================================================
// ExamForge AI OS — Workflow Guide Component
// ============================================================================
// Step-by-step workflow visualization showing progress through multi-step
// workflows (onboarding, exam creation, etc.). Supports vertical/horizontal
// orientation, connector lines, animations, skip/retry, and completion
// celebration. Fully accessible with ARIA progress bar and step roles.
// AI OS design language — uses forge accent (primary) instead of indigo.
// ============================================================================

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  X,
  RotateCcw,
  SkipForward,
  Loader2,
  Circle,
  PartyPopper,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { useConfetti } from './confetti'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowStepStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped'

export interface WorkflowGuideStep {
  id: string
  title: string
  description?: string
  status: WorkflowStepStatus
  /** Optional icon identifier (emoji or Lucide icon name) */
  icon?: string
}

export interface WorkflowGuideProps {
  /** Array of steps to display */
  steps: WorkflowGuideStep[]
  /** Callback when a step is clicked */
  onStepClick?: (_stepId: string) => void
  /** Layout orientation */
  orientation?: 'vertical' | 'horizontal'
  /** Whether to show connector lines between steps */
  showConnectors?: boolean
  /** Whether to allow skipping steps */
  allowSkip?: boolean
  /** Whether to allow retrying failed steps */
  allowRetry?: boolean
  /** Callback to skip a step */
  onSkip?: (_stepId: string) => void
  /** Callback to retry a step */
  onRetry?: (_stepId: string) => void
  /** Additional class name */
  className?: string
  /** Whether to show completion celebration */
  showCelebration?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

// ─── Size config ──────────────────────────────────────────────────────────────

const sizeConfig = {
  sm: { circle: 'h-7 w-7', icon: 'h-3.5 w-3.5', text: 'text-xs', gap: 'gap-2' },
  md: { circle: 'h-9 w-9', icon: 'h-4 w-4', text: 'text-sm', gap: 'gap-3' },
  lg: { circle: 'h-11 w-11', icon: 'h-5 w-5', text: 'text-base', gap: 'gap-3' },
} as const

// ─── Step Indicator (the circle with icon) ────────────────────────────────────

interface StepIndicatorProps {
  status: WorkflowStepStatus
  stepNumber: number
  size: 'sm' | 'md' | 'lg'
  isClickable: boolean
  onClick?: () => void
}

function StepIndicator({ status, stepNumber, size, isClickable, onClick }: StepIndicatorProps) {
  const prefersReducedMotion = useReducedMotion()
  const cfg = sizeConfig[size]

  const statusStyles: Record<WorkflowStepStatus, string> = {
    completed: 'border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/20',
    active: 'border-primary bg-primary text-white shadow-md shadow-primary/25',
    pending: 'border-gray-300 bg-background text-gray-400 dark:border-gray-600 dark:text-foreground/60',
    failed: 'border-rose-500 bg-rose-500 text-white shadow-sm shadow-rose-500/20',
    skipped: 'border-gray-300 bg-gray-100 text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-foreground/60',
  }

  const inner = (() => {
    switch (status) {
      case 'completed':
        return <Check className={cfg.icon} strokeWidth={2.5} />
      case 'active':
        return prefersReducedMotion ? (
          <span className={cn('font-semibold', cfg.text)}>{stepNumber}</span>
        ) : (
          <Loader2 className={cn(cfg.icon, 'animate-spin')} />
        )
      case 'failed':
        return <X className={cfg.icon} strokeWidth={2.5} />
      case 'skipped':
        return <SkipForward className={cfg.icon} />
      default:
        return <Circle className={cn(cfg.icon, 'fill-current')} strokeWidth={0} />
    }
  })()

  const button = (
    <button
      type="button"
      className={cn(
        'flex items-center justify-center rounded-full border-2 transition-all duration-300',
        cfg.circle,
        statusStyles[status],
        isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default',
      )}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      aria-label={`Step ${stepNumber}: ${status}`}
    >
      {inner}
    </button>
  )

  if (prefersReducedMotion) return button

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      key={`indicator-${status}`}
    >
      {button}
    </motion.div>
  )
}

// ─── Connector Line ───────────────────────────────────────────────────────────

interface ConnectorProps {
  fromStatus: WorkflowStepStatus
  toStatus: WorkflowStepStatus
  orientation: 'vertical' | 'horizontal'
  size: 'sm' | 'md' | 'lg'
}

function Connector({ fromStatus, orientation, size }: ConnectorProps) {
  const isVertical = orientation === 'vertical'
  const vLen = size === 'sm' ? 'h-6' : size === 'md' ? 'h-8' : 'h-10'
  const hLen = size === 'sm' ? 'w-8' : size === 'md' ? 'w-12' : 'w-16'

  const color = fromStatus === 'completed'
    ? 'bg-emerald-400 dark:bg-emerald-600'
    : fromStatus === 'active'
      ? 'bg-primary/40 dark:bg-primary/60'
      : 'bg-gray-200 dark:bg-gray-700'

  return (
    <div
      className={cn(
        'flex-shrink-0 transition-colors duration-300',
        isVertical ? cn(vLen, 'w-0.5') : cn(hLen, 'h-0.5'),
        color,
      )}
      aria-hidden="true"
    />
  )
}

// ─── Step Title & Description ─────────────────────────────────────────────────

interface StepContentProps {
  step: WorkflowGuideStep
  stepNumber: number
  size: 'sm' | 'md' | 'lg'
  allowSkip: boolean
  allowRetry: boolean
  onSkip?: (_stepId: string) => void
  onRetry?: (_stepId: string) => void
  orientation: 'vertical' | 'horizontal'
}

function StepContent({
  step,
  size,
  allowSkip,
  allowRetry,
  onSkip,
  onRetry,
  orientation,
}: StepContentProps) {
  const prefersReducedMotion = useReducedMotion()
  const cfg = sizeConfig[size]
  const isVertical = orientation === 'vertical'

  const titleColor: Record<WorkflowStepStatus, string> = {
    completed: 'text-emerald-600 dark:text-emerald-400',
    active: 'text-primary',
    failed: 'text-rose-700 dark:text-rose-400',
    pending: 'text-foreground/60 dark:text-gray-400',
    skipped: 'text-gray-400 dark:text-foreground/60 line-through',
  }

  return (
    <div className={cn('flex flex-col', isVertical ? '' : 'items-center text-center')}>
      <span className={cn('font-medium leading-tight', cfg.text, titleColor[step.status])}>
        {step.title}
      </span>
      {step.description && (
        <span
          className={cn(
            'text-xs leading-relaxed text-muted-foreground mt-0.5',
            step.status === 'skipped' && 'line-through',
          )}
        >
          {step.description}
        </span>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-1.5">
        {allowSkip && step.status === 'active' && onSkip && (
          <motion.button
            type="button"
            onClick={() => onSkip(step.id)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
              'text-foreground/60 transition-colors hover:bg-gray-100 hover:text-gray-700',
              'dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300',
            )}
            whileHover={prefersReducedMotion ? {} : { x: 2 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
          >
            <SkipForward className="h-3 w-3" />
            Skip
          </motion.button>
        )}
        {allowRetry && step.status === 'failed' && onRetry && (
          <motion.button
            type="button"
            onClick={() => onRetry(step.id)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
              'text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700',
              'dark:text-rose-400 dark:hover:bg-rose-950/50 dark:hover:text-rose-300',
            )}
            whileHover={prefersReducedMotion ? {} : { x: 2 }}
            whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </motion.button>
        )}
      </div>
    </div>
  )
}

// ─── Completion Celebration ───────────────────────────────────────────────────

function CompletionCelebration({ visible }: { visible: boolean }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="flex items-center justify-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/50 dark:border-emerald-800 px-6 py-4"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <motion.div
            animate={prefersReducedMotion ? {} : { rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <PartyPopper className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </motion.div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              All steps completed!
            </span>
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Great work — your workflow is done.
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Main WorkflowGuide Component ─────────────────────────────────────────────

export function WorkflowGuide({
  steps,
  onStepClick,
  orientation = 'vertical',
  showConnectors = true,
  allowSkip = false,
  allowRetry = false,
  onSkip,
  onRetry,
  className,
  showCelebration = true,
  size = 'md',
}: WorkflowGuideProps) {
  const prefersReducedMotion = useReducedMotion()
  const { trigger: triggerConfetti } = useConfetti()
  const isVertical = orientation === 'vertical'
  const cfg = sizeConfig[size]

  const completedCount = React.useMemo(
    () => steps.filter((s) => s.status === 'completed').length,
    [steps]
  )

  const isComplete = React.useMemo(
    () => steps.length > 0 && steps.every((s) => s.status === 'completed' || s.status === 'skipped'),
    [steps]
  )

  const progressPercent = steps.length === 0
    ? 0
    : Math.round((completedCount / steps.length) * 100)

  // Fire confetti on completion
  const prevCompleteRef = React.useRef(false)
  React.useEffect(() => {
    if (isComplete && !prevCompleteRef.current && showCelebration) {
      triggerConfetti()
    }
    prevCompleteRef.current = isComplete
  }, [isComplete, showCelebration, triggerConfetti])

  return (
    <div
      className={cn('relative', className)}
      role="progressbar"
      aria-label={`Workflow progress: ${completedCount} of ${steps.length} steps completed (${progressPercent}%)`}
      aria-valuemin={0}
      aria-valuemax={steps.length}
      aria-valuenow={completedCount}
    >
      <div
        className={cn(
          'flex',
          isVertical ? 'flex-col' : 'flex-row items-start',
        )}
        role="list"
      >
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1

          return (
            <React.Fragment key={step.id}>
              <motion.div
                className={cn(
                  'flex',
                  isVertical ? 'flex-row items-start' : 'flex-col items-center',
                  cfg.gap,
                )}
                role="listitem"
                aria-current={step.status === 'active' ? 'step' : undefined}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: isVertical ? 8 : 0, x: isVertical ? 0 : 8 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.06 }}
              >
                <StepIndicator
                  status={step.status}
                  stepNumber={index + 1}
                  size={size}
                  isClickable={!!onStepClick}
                  onClick={() => onStepClick?.(step.id)}
                />
                <StepContent
                  step={step}
                  stepNumber={index + 1}
                  size={size}
                  allowSkip={allowSkip}
                  allowRetry={allowRetry}
                  onSkip={onSkip}
                  onRetry={onRetry}
                  orientation={orientation}
                />
              </motion.div>

              {/* Connector between steps */}
              {showConnectors && !isLast && (
                <div
                  className={cn(
                    'flex',
                    isVertical ? 'flex-col items-center pl-[1.125rem]' : 'flex-row items-center py-2',
                  )}
                >
                  <Connector
                    fromStatus={step.status}
                    toStatus={steps[index + 1]?.status ?? 'pending'}
                    orientation={orientation}
                    size={size}
                  />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Completion celebration */}
      {showCelebration && (
        <div className="mt-4">
          <CompletionCelebration visible={isComplete} />
        </div>
      )}
    </div>
  )
}

// ─── Horizontal Workflow Bar (compact, for top-of-page) ───────────────────────

export interface WorkflowBarProps {
  steps: WorkflowGuideStep[]
  onStepClick?: (_stepId: string) => void
  className?: string
}

export function WorkflowBar({ steps, onStepClick, className }: WorkflowBarProps) {
  const completedCount = steps.filter((s) => s.status === 'completed').length

  return (
    <div
      className={cn('flex items-center gap-1', className)}
      role="group"
      aria-roledescription="progress"
      aria-label={`${completedCount} of ${steps.length} steps completed`}
    >
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <motion.button
            type="button"
            onClick={() => onStepClick?.(step.id)}
            className={cn(
              'flex h-8 min-w-[2rem] items-center justify-center rounded-full px-2 text-xs font-medium transition-all',
              step.status === 'completed' && 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20',
              step.status === 'active' && 'bg-primary text-white shadow-sm shadow-primary/20',
              step.status === 'failed' && 'bg-rose-500 text-white shadow-sm shadow-rose-500/20',
              step.status === 'skipped' && 'bg-gray-200 text-foreground/60 dark:bg-gray-700 dark:text-gray-400',
              step.status === 'pending' && 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-foreground/60',
              onStepClick && 'cursor-pointer hover:opacity-80',
            )}
            whileHover={onStepClick ? { scale: 1.05 } : {}}
            whileTap={onStepClick ? { scale: 0.95 } : {}}
            aria-label={`Step ${index + 1}: ${step.title} — ${step.status}`}
            aria-current={step.status === 'active' ? 'step' : undefined}
          >
            {step.status === 'completed' ? (
              <Check className="h-3.5 w-3.5" />
            ) : step.status === 'failed' ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <span>{index + 1}</span>
            )}
          </motion.button>

          {index < steps.length - 1 && (
            <div
              className={cn(
                'h-0.5 w-4 flex-shrink-0 transition-colors',
                step.status === 'completed' ? 'bg-emerald-400 dark:bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700',
              )}
              aria-hidden="true"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
