'use client'

// ============================================================================
// ExamForge AI — Multi-Step Form Progress Indicator
// ============================================================================

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function ProgressIndicator({ steps, currentStep, className }: ProgressIndicatorProps) {
  return (
    <nav aria-label="Form progress" className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isUpcoming = index > currentStep

        return (
          <div key={step} className="flex items-center">
            {/* Step circle */}
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300',
                isCompleted && 'bg-primary text-primary-foreground',
                isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
                isUpcoming && 'bg-muted text-muted-foreground'
              )}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                index + 1
              )}
            </div>

            {/* Step label */}
            <span
              className={cn(
                'ml-2 text-sm hidden sm:block',
                isCurrent && 'font-semibold text-foreground',
                isCompleted && 'text-foreground',
                isUpcoming && 'text-muted-foreground'
              )}
            >
              {step}
            </span>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-8 sm:w-16 transition-colors duration-300',
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                )}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
