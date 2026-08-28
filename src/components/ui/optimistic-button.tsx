'use client'

import React, { useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check, Undo2, AlertCircle } from 'lucide-react'
import { Button } from './button'

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------
type OptimisticState = 'idle' | 'loading' | 'success' | 'error'

// ---------------------------------------------------------------------------
// Reduced-motion check
// ---------------------------------------------------------------------------
const useReducedMotion = (): boolean => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }
  return false
}

// ---------------------------------------------------------------------------
// OptimisticButton — shows success immediately, reverts on failure
// ---------------------------------------------------------------------------
export interface OptimisticButtonProps {
  /** Async action to perform on click */
  action: () => Promise<void>
  /** Optional undo action (for destructive operations) */
  undo?: () => Promise<void>
  /** Duration in ms to show success state before reverting (default 2500) */
  successDuration?: number
  /** Show undo button after success? */
  showUndo?: boolean
  /** Success label override */
  successLabel?: string
  /** Error label override */
  errorLabel?: string
  /** Undo label override */
  undoLabel?: string
  /** Button variant */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Whether disabled */
  disabled?: boolean
  /** Button children */
  children?: React.ReactNode
  /** Class name */
  className?: string
  /** Click handler (called before action) */
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export function OptimisticButton({
  action,
  undo,
  successDuration = 2500,
  showUndo = false,
  successLabel,
  errorLabel,
  undoLabel,
  variant = 'default',
  size = 'default',
  disabled,
  children,
  className,
  onClick,
}: OptimisticButtonProps) {
  const [state, setState] = useState<OptimisticState>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const reduced = useReducedMotion()

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (state !== 'idle') return
      onClick?.(e)

      // Optimistic: show loading spinner immediately
      setState('loading')

      try {
        await action()
        // Success — show checkmark
        setState('success')
        timeoutRef.current = setTimeout(() => setState('idle'), successDuration)
      } catch {
        // Error — shake and revert
        setState('error')
        timeoutRef.current = setTimeout(() => setState('idle'), 2000)
      }
    },
    [action, state, onClick, successDuration],
  )

  const handleUndo = useCallback(async () => {
    if (!undo) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setState('loading')
    try {
      await undo()
    } finally {
      setState('idle')
    }
  }, [undo])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [])

  const isDisabled = disabled || state === 'loading'

  return (
    <div className="inline-flex items-center gap-2">
      <motion.div
        whileTap={!reduced && state === 'idle' ? { scale: 0.96 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        <Button
          variant={variant}
          size={size}
          disabled={isDisabled}
          onClick={handleClick}
          className={`relative overflow-hidden ${className ?? ''}`}
        >
          <AnimatePresence mode="wait">
            {/* Idle — original children */}
            {state === 'idle' && (
              <motion.span
                key="idle"
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {children}
              </motion.span>
            )}

            {/* Loading — spinner */}
            {state === 'loading' && (
              <motion.span
                key="loading"
                className="flex items-center gap-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                {children}
              </motion.span>
            )}

            {/* Success — checkmark with spring bounce */}
            {state === 'success' && (
              <motion.span
                key="success"
                className="flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 300, damping: 20 }
                }
              >
                <Check className="h-4 w-4" />
                {successLabel ?? 'Done'}
              </motion.span>
            )}

            {/* Error — alert icon with shake */}
            {state === 'error' && (
              <motion.span
                key="error"
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: [0, -3, 3, -3, 0] }}
                exit={{ opacity: 0, x: 4 }}
                transition={{ duration: 0.4 }}
              >
                <AlertCircle className="h-4 w-4" />
                {errorLabel ?? 'Error'}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Undo button — appears beside the button on success */}
      <AnimatePresence>
        {state === 'success' && showUndo && undo && (
          <motion.button
            initial={{ opacity: 0, x: -10, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={handleUndo}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {undoLabel ?? 'Undo'}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
