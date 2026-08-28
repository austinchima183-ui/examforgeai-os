'use client'

// ============================================================================
// ExamForge AI OS — Sticky CTA Bar
// ============================================================================
// Fixed to bottom of viewport, appears after scrolling past hero.
// Minimal glass, small. Two compact buttons. Dismissible.
// Desktop only. SILENT. CALM. FOCUSED.
// ============================================================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Play } from 'lucide-react'
import Link from 'next/link'

function getInitialDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return !!sessionStorage.getItem('sticky_cta_dismissed')
}

export function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(getInitialDismissed)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (isDismissed) return

    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()

    const handleScroll = () => {
      setIsVisible(window.scrollY > 600)
    }

    const handleResize = () => {
      checkMobile()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [isDismissed])

  const handleDismiss = () => {
    setIsDismissed(true)
    sessionStorage.setItem('sticky_cta_dismissed', 'true')
  }

  const show = isVisible && !isDismissed && !isMobile

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-0 left-0 right-0 z-40 forge-glass-elevated border-t border-white/[0.04]"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-foreground/40 hidden sm:block">
              Ready to transform your school&apos;s exams?
            </p>
            <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-center sm:justify-end">
              <Link
                href="/demo"
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium text-white/60 hover:text-white/90 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] transition-all duration-200"
              >
                <Calendar className="h-3 w-3" />
                Demo
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-xs font-medium text-white/90 bg-blue-500/15 border border-blue-400/20 hover:bg-blue-500/25 transition-all duration-200"
              >
                <Play className="h-3 w-3" />
                Free Trial
              </Link>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/20 hover:text-white/50 transition-colors duration-200 p-1"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
