'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CodeBlock } from '@/components/docs/code-block'

// ============================================================================
// ExamForge AI — Interactive Walkthrough
// ============================================================================
// Client component for step-by-step interactive walkthroughs with progress
// tracking, code block rendering, and a completion celebration state.
// ============================================================================

interface WalkthroughStep {
  title: string
  description: string
  code?: string
  image?: string
}

interface InteractiveWalkthroughProps {
  title: string
  steps: WalkthroughStep[]
  onComplete?: () => void
}

export function InteractiveWalkthrough({
  title,
  steps,
  onComplete,
}: InteractiveWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const totalSteps = steps.length
  const progressPercent = ((currentStep + 1) / totalSteps) * 100
  const step = steps[currentStep]

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      setIsComplete(true)
      onComplete?.()
    }
  }, [currentStep, totalSteps, onComplete])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevious()
      }
    },
    [handleNext, handlePrevious]
  )

  if (isComplete) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          {/* Confetti-like celebration dots */}
          <div className="relative mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Sparkles className="size-12 text-primary" />
            </motion.div>
            {/* Animated dots */}
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute size-2 rounded-full"
                style={{
                  background: `hsl(${i * 30}, 80%, 60%)`,
                  left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 12)}%`,
                  top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 12)}%`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.08,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
              />
            ))}
          </div>
          <motion.h3
            className="text-xl font-semibold text-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Walkthrough Complete!
          </motion.h3>
          <motion.p
            className="mt-2 text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            You&apos;ve completed all {totalSteps} steps of &ldquo;{title}&rdquo;.
          </motion.p>
          <motion.div
            className="mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="outline"
              onClick={() => {
                setCurrentStep(0)
                setIsComplete(false)
              }}
            >
              Restart Walkthrough
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden" onKeyDown={handleKeyDown}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span
            className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            aria-live="polite"
          >
            {currentStep + 1} / {totalSteps}
          </span>
        </div>
        <Progress value={progressPercent} className="mt-2" aria-label={`Step ${currentStep + 1} of ${totalSteps}`} />
      </CardHeader>

      <CardContent className="pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="space-y-4"
          >
            <div>
              <h4 className="text-base font-semibold text-foreground">
                {step.title}
              </h4>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>

            {step.image && (
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={step.image}
                  alt={`Illustration for step: ${step.title}`}
                  className="w-full object-cover"
                />
              </div>
            )}

            {step.code && (
              <CodeBlock
                code={step.code}
                language="typescript"
                showLineNumbers
                copyable
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            aria-label="Go to previous step"
          >
            <ChevronLeft className="size-4" />
            Previous
          </Button>

          <div className="flex gap-1" role="tablist" aria-label="Walkthrough steps">
            {steps.map((_, idx) => (
              <button
                key={idx}
                role="tab"
                aria-selected={idx === currentStep}
                aria-label={`Go to step ${idx + 1}`}
                className={cn(
                  'size-2 rounded-full transition-colors',
                  idx === currentStep
                    ? 'bg-primary'
                    : idx < currentStep
                      ? 'bg-primary/40'
                      : 'bg-muted-foreground/20'
                )}
                onClick={() => setCurrentStep(idx)}
              />
            ))}
          </div>

          <Button
            size="sm"
            onClick={handleNext}
            aria-label={
              currentStep === totalSteps - 1
                ? 'Complete walkthrough'
                : 'Go to next step'
            }
          >
            {currentStep === totalSteps - 1 ? 'Done' : 'Next'}
            {currentStep < totalSteps - 1 && (
              <ChevronRight className="size-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
