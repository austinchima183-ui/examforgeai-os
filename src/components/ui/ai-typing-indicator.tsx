'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ---------------------------------------------------------------------------
// Reduced-motion hook (reactive)
// ---------------------------------------------------------------------------
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

// ---------------------------------------------------------------------------
// Single thinking dot with staggered pulse (animate-ai-think)
// ---------------------------------------------------------------------------
function ThinkingDot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      className="inline-block h-2 w-2 rounded-full bg-cyan-400"
      animate={{ y: [0, -5, 0], scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 0.8, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  )
}

// ---------------------------------------------------------------------------
// AITypingIndicator
// ---------------------------------------------------------------------------
export interface AITypingIndicatorProps {
  /** Show the indicator? */
  active: boolean
  /** Text label (default: "Thinking...") */
  label?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Alignment */
  align?: 'left' | 'center' | 'right'
  /** Optional streaming text that replaces the indicator when it arrives */
  streamingText?: string
}

export function AITypingIndicator({
  active,
  label = 'Thinking...',
  size = 'md',
  align = 'left',
  streamingText,
}: AITypingIndicatorProps) {
  const reduced = useReducedMotion()

  const sizeStyles = {
    sm: { gap: 'gap-1', dot: 'h-1.5 w-1.5', text: 'text-[11px]', py: 'py-1.5', px: 'px-2.5' },
    md: { gap: 'gap-1.5', dot: 'h-2 w-2', text: 'text-xs', py: 'py-2', px: 'px-3' },
    lg: { gap: 'gap-2', dot: 'h-2.5 w-2.5', text: 'text-sm', py: 'py-2.5', px: 'px-3.5' },
  }

  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }

  const s = sizeStyles[size]

  return (
    <AnimatePresence mode="wait">
      {/* Thinking state — animated dots + cyan label */}
      {active && !streamingText && (
        <motion.div
          key="thinking"
          className={`flex items-center ${alignStyles[align]}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={`flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-cyan-400/10 ${s.px} ${s.py} backdrop-blur-sm`}>
            {/* Three animated dots with stagger */}
            <div className={`flex items-center ${s.gap}`}>
              {reduced ? (
                <>
                  <span className={`inline-block rounded-full bg-cyan-400 ${s.dot}`} />
                  <span className={`inline-block rounded-full bg-cyan-400 ${s.dot}`} />
                  <span className={`inline-block rounded-full bg-cyan-400 ${s.dot}`} />
                </>
              ) : (
                <>
                  <ThinkingDot delay={0} />
                  <ThinkingDot delay={0.15} />
                  <ThinkingDot delay={0.3} />
                </>
              )}
            </div>
            {/* Label in cyan */}
            <span className={`${s.text} font-medium text-cyan-400`}>
              {label}
            </span>
          </div>
        </motion.div>
      )}

      {/* Streaming response: smooth crossfade with blinking cursor */}
      {active && streamingText && (
        <motion.div
          key="streaming"
          className={alignStyles[align]}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="rounded-xl bg-white/[0.04] border border-border/30 px-3.5 py-2.5 text-foreground shadow-sm backdrop-blur-sm forge-glass-surface">
            {streamingText}
            {/* Blinking cursor */}
            <motion.span
              className="ml-0.5 inline-block h-4 w-[2px] align-text-bottom bg-cyan-400"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// Convenience: dot-only inline variant
// ---------------------------------------------------------------------------
export interface AIDotsProps {
  active: boolean
}

export function AIDots({ active }: AIDotsProps) {
  const reduced = useReducedMotion()

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="inline-flex items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {reduced ? (
            <>
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
            </>
          ) : (
            <>
              <ThinkingDot delay={0} />
              <ThinkingDot delay={0.15} />
              <ThinkingDot delay={0.3} />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
