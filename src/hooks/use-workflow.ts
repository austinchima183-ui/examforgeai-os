'use client'

// ============================================================================
// ExamForge AI — Workflow State Management Hook
// ============================================================================
// Manages multi-step workflow state with local storage persistence for crash
// recovery. Provides complete step lifecycle: next, back, skip, retry,
// complete, fail, reset. Auto-detects workflow completion.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkflowStepStatus = 'pending' | 'active' | 'completed' | 'failed' | 'skipped'

export interface WorkflowStep {
  id: string
  title: string
  description?: string
  status: WorkflowStepStatus
  icon?: string
}

export interface UseWorkflowOptions {
  /** Unique key for localStorage persistence (enables crash recovery) */
  persistKey?: string
  /** Auto-advance to next pending step when current step completes */
  autoAdvance?: boolean
  /** Callback when all steps are completed */
  onComplete?: () => void
  /** Callback when a step fails */
  onStepFail?: (_stepId: string) => void
  /** Callback when a step status changes */
  onStepChange?: (_stepId: string, _status: WorkflowStepStatus) => void
}

export interface WorkflowState {
  steps: WorkflowStep[]
  currentStepIndex: number
}

export interface UseWorkflowReturn {
  /** Current active step object */
  currentStep: WorkflowStep | null
  /** Index of the current active step */
  currentStepIndex: number
  /** All steps with their current statuses */
  allSteps: WorkflowStep[]
  /** Percentage of completed steps (0-100) */
  progress: number
  /** Whether all steps are completed (ignoring skipped) */
  isComplete: boolean
  /** Whether any step has failed */
  hasFailed: boolean
  /** Count of completed steps */
  completedCount: number
  /** Count of skipped steps */
  skippedCount: number
  /** Advance to the next step */
  next: () => void
  /** Go back to the previous step */
  back: () => void
  /** Skip the current step */
  skip: () => void
  /** Retry the current (failed) step */
  retry: () => void
  /** Mark the current step as completed */
  complete: () => void
  /** Mark the current step as failed */
  fail: () => void
  /** Reset the entire workflow to initial state */
  reset: () => void
  /** Jump to a specific step by ID */
  goToStep: (_stepId: string) => void
  /** Update a specific step's status */
  setStepStatus: (_stepId: string, _status: WorkflowStepStatus) => void
}

// ─── Persistence helpers ─────────────────────────────────────────────────────

function loadState(key: string): WorkflowState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(`examforge:workflow:${key}`)
    if (!raw) return null
    return JSON.parse(raw) as WorkflowState
  } catch {
    return null
  }
}

function saveState(key: string, state: WorkflowState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`examforge:workflow:${key}`, JSON.stringify(state))
  } catch {
    // Storage full or unavailable — degrade gracefully
  }
}

function clearState(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(`examforge:workflow:${key}`)
  } catch {
    // Ignore
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkflow(
  initialSteps: WorkflowStep[],
  options: UseWorkflowOptions = {}
): UseWorkflowReturn {
  const {
    persistKey,
    autoAdvance = true,
    onComplete,
    onStepFail,
    onStepChange,
  } = options

  // ── Initialize state (with crash recovery from localStorage) ──
  const [state, setState] = useState<WorkflowState>(() => {
    if (persistKey) {
      const persisted = loadState(persistKey)
      if (persisted && persisted.steps.length === initialSteps.length) {
        // Verify step IDs match (schema hasn't changed)
        const idsMatch = persisted.steps.every(
          (s, i) => s.id === initialSteps[i].id
        )
        if (idsMatch) return persisted
      }
    }

    // Fresh start: first step active, rest pending
    const steps = initialSteps.map((step, i) => ({
      ...step,
      status: i === 0 ? ('active' as WorkflowStepStatus) : ('pending' as WorkflowStepStatus),
    }))
    return { steps, currentStepIndex: 0 }
  })

  // Keep refs for callbacks to avoid stale closures
  const onCompleteRef = useRef(onComplete)
  const onStepFailRef = useRef(onStepFail)
  const onStepChangeRef = useRef(onStepChange)

  useEffect(() => {
    onCompleteRef.current = onComplete
    onStepFailRef.current = onStepFail
    onStepChangeRef.current = onStepChange
  })

  // ── Persist state changes ──
  useEffect(() => {
    if (persistKey) {
      saveState(persistKey, state)
    }
  }, [state, persistKey])

  // ── Derived values ──
  const currentStep = state.steps[state.currentStepIndex] ?? null

  const completedCount = useMemo(
    () => state.steps.filter((s) => s.status === 'completed').length,
    [state.steps]
  )

  const skippedCount = useMemo(
    () => state.steps.filter((s) => s.status === 'skipped').length,
    [state.steps]
  )

  const progress = useMemo(() => {
    if (state.steps.length === 0) return 0
    return Math.round((completedCount / state.steps.length) * 100)
  }, [completedCount, state.steps.length])

  const isComplete = useMemo(
    () => state.steps.length > 0 && state.steps.every(
      (s) => s.status === 'completed' || s.status === 'skipped'
    ),
    [state.steps]
  )

  const hasFailed = useMemo(
    () => state.steps.some((s) => s.status === 'failed'),
    [state.steps]
  )

  // ── Auto-completion detection ──
  const prevIsCompleteRef = useRef(false)
  useEffect(() => {
    if (isComplete && !prevIsCompleteRef.current) {
      onCompleteRef.current?.()
      // Clear persisted state on completion
      if (persistKey) clearState(persistKey)
    }
    prevIsCompleteRef.current = isComplete
  }, [isComplete, persistKey])

  // ── Actions ──

  const updateStep = useCallback(
    (stepIndex: number, newStatus: WorkflowStepStatus) => {
      setState((prev) => {
        const steps = prev.steps.map((s, i) =>
          i === stepIndex ? { ...s, status: newStatus } : s
        )

        // Determine new current step index
        let nextIndex = prev.currentStepIndex
        if (autoAdvance && newStatus === 'completed') {
          // Find next pending step
          const nextPending = steps.findIndex(
            (s, i) => i > stepIndex && s.status === 'pending'
          )
          if (nextPending !== -1) {
            steps[nextPending] = { ...steps[nextPending], status: 'active' }
            nextIndex = nextPending
          } else {
            // Check if there's a pending step before (shouldn't happen in linear flow)
            const anyPending = steps.findIndex((s) => s.status === 'pending')
            if (anyPending !== -1) {
              steps[anyPending] = { ...steps[anyPending], status: 'active' }
              nextIndex = anyPending
            }
          }
        } else if (newStatus === 'failed') {
          nextIndex = stepIndex
        } else if (newStatus === 'skipped' && autoAdvance) {
          const nextPending = steps.findIndex(
            (s, i) => i > stepIndex && s.status === 'pending'
          )
          if (nextPending !== -1) {
            steps[nextPending] = { ...steps[nextPending], status: 'active' }
            nextIndex = nextPending
          }
        }

        return { steps, currentStepIndex: nextIndex }
      })

      // Fire callbacks
      const step = state.steps[stepIndex]
      if (step) {
        onStepChangeRef.current?.(step.id, newStatus)
        if (newStatus === 'failed') {
          onStepFailRef.current?.(step.id)
        }
      }
    },
    [autoAdvance, state.steps]
  )

  const complete = useCallback(() => {
    if (state.currentStepIndex < 0 || state.currentStepIndex >= state.steps.length) return
    updateStep(state.currentStepIndex, 'completed')
  }, [state.currentStepIndex, state.steps.length, updateStep])

  const fail = useCallback(() => {
    if (state.currentStepIndex < 0 || state.currentStepIndex >= state.steps.length) return
    updateStep(state.currentStepIndex, 'failed')
  }, [state.currentStepIndex, state.steps.length, updateStep])

  const skip = useCallback(() => {
    if (state.currentStepIndex < 0 || state.currentStepIndex >= state.steps.length) return
    updateStep(state.currentStepIndex, 'skipped')
  }, [state.currentStepIndex, state.steps.length, updateStep])

  const retry = useCallback(() => {
    if (state.currentStepIndex < 0 || state.currentStepIndex >= state.steps.length) return
    const currentStatus = state.steps[state.currentStepIndex]?.status
    if (currentStatus !== 'failed') return
    updateStep(state.currentStepIndex, 'active')
  }, [state.currentStepIndex, state.steps, updateStep])

  const next = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.steps.findIndex(
        (s, i) => i > prev.currentStepIndex && (s.status === 'pending' || s.status === 'skipped')
      )
      if (nextIndex === -1) return prev

      const steps = prev.steps.map((s, i) => {
        if (i === nextIndex && s.status === 'pending') return { ...s, status: 'active' as WorkflowStepStatus }
        return s
      })
      return { steps, currentStepIndex: nextIndex }
    })
  }, [])

  const back = useCallback(() => {
    setState((prev) => {
      const prevIndex = prev.steps.findLastIndex(
        (s, i) => i < prev.currentStepIndex && (s.status === 'completed' || s.status === 'skipped')
      )
      if (prevIndex === -1) return prev

      const steps = prev.steps.map((s, i) => {
        if (i === prevIndex) return { ...s, status: 'active' as WorkflowStepStatus }
        if (i === prev.currentStepIndex && s.status === 'active') return { ...s, status: 'pending' as WorkflowStepStatus }
        return s
      })
      return { steps, currentStepIndex: prevIndex }
    })
  }, [])

  const reset = useCallback(() => {
    const steps = initialSteps.map((step, i) => ({
      ...step,
      status: i === 0 ? ('active' as WorkflowStepStatus) : ('pending' as WorkflowStepStatus),
    }))
    setState({ steps, currentStepIndex: 0 })
    if (persistKey) clearState(persistKey)
  }, [initialSteps, persistKey])

  const goToStep = useCallback((stepId: string) => {
    setState((prev) => {
      const targetIndex = prev.steps.findIndex((s) => s.id === stepId)
      if (targetIndex === -1) return prev

      const steps = prev.steps.map((s, i) => {
        if (i === targetIndex) return { ...s, status: 'active' as WorkflowStepStatus }
        if (i === prev.currentStepIndex && s.status === 'active') return { ...s, status: 'pending' as WorkflowStepStatus }
        return s
      })
      return { steps, currentStepIndex: targetIndex }
    })
  }, [])

  const setStepStatus = useCallback((_stepId: string, _status: WorkflowStepStatus) => {
    setState((prev) => {
      const stepIndex = prev.steps.findIndex((s) => s.id === _stepId)
      if (stepIndex === -1) return prev

      const steps = prev.steps.map((s, i) =>
        i === stepIndex ? { ...s, status: _status } : s
      )
      return { ...prev, steps }
    })
    onStepChangeRef.current?.(_stepId, _status)
  }, [])

  return {
    currentStep,
    currentStepIndex: state.currentStepIndex,
    allSteps: state.steps,
    progress,
    isComplete,
    hasFailed,
    completedCount,
    skippedCount,
    next,
    back,
    skip,
    retry,
    complete,
    fail,
    reset,
    goToStep,
    setStepStatus,
  }
}
