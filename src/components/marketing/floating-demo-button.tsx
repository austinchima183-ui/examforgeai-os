'use client'

// ============================================================================
// ExamForge AI OS — Floating Demo Button
// ============================================================================
// Fixed position bottom-right. Small, subtle, rounded-full.
// forge-glow on hover. Not distracting. Appears after 8s.
// Hidden on pages that already have a demo CTA (hero, demo page).
// ============================================================================

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar } from 'lucide-react'
import Link from 'next/link'

export function FloatingDemoButton() {
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Don't show on demo page or home hero
    const pathname = window.location.pathname
    if (pathname === '/demo' || pathname === '/') {
      return
    }

    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile, { passive: true })

    // Show after 8 seconds
    const timer = setTimeout(() => {
      // Don't show if sticky CTA is visible and not dismissed
      if (
        !sessionStorage.getItem('sticky_cta_dismissed') &&
        window.scrollY > 600 &&
        !isMobile
      ) {
        // Sticky CTA is showing on desktop, skip floating button
        return
      }
      setIsVisible(true)
    }, 8000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', checkMobile)
    }
  }, [isMobile])

  // Don't show on mobile
  if (isMobile) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-6 right-6 z-30"
        >
          <Link
            href="/demo"
            className="group relative flex items-center gap-1.5 h-9 pl-3 pr-4 rounded-full bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/[0.10] hover:border-white/[0.12] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-200"
            aria-label="Book a demo"
          >
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-xs font-medium whitespace-nowrap">
              Demo
            </span>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
