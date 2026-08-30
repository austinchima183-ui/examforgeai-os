'use client'

// ============================================================================
// ExamForge AI OS — Announcement Bar
// ============================================================================
// Extremely minimal. One thin line (h-7), neural-cyan text, subtle, dismissible.
// No background color — just text on #090909. SILENT. CALM. EXPENSIVE.
// ============================================================================

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import Link from 'next/link'

export type AnnouncementType = 'promo' | 'feature' | 'event' | 'update'

interface AnnouncementBarProps {
  type?: AnnouncementType
  message?: string
  ctaText?: string
  ctaHref?: string
  dismissable?: boolean
  storageKey?: string
}

const DISMISS_HOURS = 24

function getInitialVisibility(dismissable: boolean, storageKey: string): boolean {
  if (!dismissable) return true
  if (typeof window === 'undefined') return true
  const dismissedAt = localStorage.getItem(storageKey)
  if (dismissedAt) {
    const elapsed = Date.now() - new Date(dismissedAt).getTime()
    const hoursElapsed = elapsed / (1000 * 60 * 60)
    if (hoursElapsed < DISMISS_HOURS) return false
  }
  return true
}

export function AnnouncementBar({
  type = 'feature',
  message = 'AI-Powered Exam Generation v2 — Generate 40 questions in 30 seconds',
  ctaText = 'Learn more',
  ctaHref = '/features',
  dismissable = true,
  storageKey = 'announcement_dismissed',
}: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(() =>
    getInitialVisibility(dismissable, storageKey),
  )

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(storageKey, new Date().toISOString())
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="overflow-hidden"
        >
          <div className="relative bg-[#090909] border-b border-white/[0.04]">
            {/* Nearly invisible neural line at bottom */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-7 flex items-center justify-center gap-2.5 text-xs">
              <span className="text-cyan-400/70">{message}</span>
              {ctaText && ctaHref && (
                <Link
                  href={ctaHref}
                  className="text-cyan-300/80 hover:text-cyan-300 transition-colors duration-200"
                >
                  {ctaText} →
                </Link>
              )}
              {dismissable && (
                <button
                  onClick={handleDismiss}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors duration-200"
                  aria-label="Dismiss announcement"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
