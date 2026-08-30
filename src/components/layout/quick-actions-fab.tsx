'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Command, Sparkles } from 'lucide-react'

// ============================================================================
// ExamForge AI — Floating Action Button (Dashboard UX 3.0)
// ============================================================================
// Persistent quick-actions launcher, bottom-right of the app frame.
// Opens the command palette (⌘K) — the fastest path to any action.
// - Hover expands to a labelled pill (desktop)
// - Keyboard focusable with visible focus ring (WCAG 2.4.7)
// - Respects reduced-motion
// ============================================================================

export function QuickActionsFab({
  onOpen,
  hidden,
}: {
  onOpen: () => void
  /** Hide when a modal (command palette) is already open */
  hidden?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const reduced = useReducedMotion()

  if (hidden) return null

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      aria-label="Quick actions — open the command palette (Ctrl+K)"
      aria-keyshortcuts="Control+K Meta+K"
      initial={reduced ? false : { opacity: 0, scale: 0.8, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28, delay: 0.4 }}
      whileHover={reduced ? undefined : { scale: 1.05 }}
      whileTap={reduced ? undefined : { scale: 0.95 }}
      className={cn(
        'group fixed bottom-6 right-[84px] z-40 flex h-12 items-center gap-2.5 rounded-full',
        'border border-white/[0.1] bg-gradient-to-br from-[#1D1D1D] to-[#111111]',
        'pl-3.5 pr-3.5 text-foreground/90 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl',
        'transition-[padding] duration-300 hover:pr-5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909]'
      )}
    >
      <span className="relative flex h-6 w-6 items-center justify-center">
        <Command className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="absolute -right-1 -top-1 flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60 [animation-duration:2.5s]" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
        </span>
      </span>
      <AnimatePresence initial={false}>
        {hovered && (
          <motion.span
            initial={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap text-[13px] font-medium"
          >
            Quick actions
            <kbd className="ml-2 rounded border border-white/[0.12] bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </motion.span>
        )}
      </AnimatePresence>
      <Sparkles
        className="h-3.5 w-3.5 text-forge-gold/80 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      />
    </motion.button>
  )
}
