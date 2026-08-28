'use client'

// ============================================================================
// ExamForge AI — Exit Intent Popup
// ============================================================================
// Detects mouse leaving viewport top after 5s, shows CTA popup with
// "Book a Demo" and "Subscribe to Newsletter" options.
// Only once per session, not for logged-in users, not on mobile.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Mail, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ProductionNewsletterForm } from '@/components/marketing/production-newsletter-form'

export function ExitIntentPopup() {
  const [isVisible, setIsVisible] = useState(false)
  const [hasTriggered, setHasTriggered] = useState(false)

  const shouldShow = useCallback(() => {
    // Don't show if already shown this session
    if (sessionStorage.getItem('exit_intent_shown')) return false
    // Don't show on mobile (no reliable exit intent)
    if (window.innerWidth < 768) return false
    // Don't show if user is logged in (check for supabase auth cookie)
    if (document.cookie.includes('sb-')) return false
    return true
  }, [])

  const listenerRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Clean up previous listener
    if (listenerRef.current) {
      listenerRef.current()
      listenerRef.current = null
    }

    // Don't show for 5 seconds after page load
    const readyTimer = setTimeout(() => {
      const handleMouseLeave = (e: MouseEvent) => {
        // Only trigger when mouse leaves through the top of the viewport
        if (e.clientY <= 0 && shouldShow() && !hasTriggered) {
          setHasTriggered(true)
          setIsVisible(true)
          sessionStorage.setItem('exit_intent_shown', 'true')
        }
      }

      document.addEventListener('mouseleave', handleMouseLeave)
      listenerRef.current = () => document.removeEventListener('mouseleave', handleMouseLeave)
    }, 5000)

    return () => {
      clearTimeout(readyTimer)
      if (listenerRef.current) {
        listenerRef.current()
        listenerRef.current = null
      }
    }
  }, [shouldShow, hasTriggered])

  const handleClose = () => {
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleClose()
            }}
          >
            <div className="relative bg-card border border-border/50 rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8">
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close popup"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-xl font-bold mb-2">Before you go</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Don&apos;t miss out on transforming your school&apos;s exam
                management with AI.
              </p>

              <div className="space-y-3">
                {/* Book a Demo */}
                <Button asChild className="w-full" size="lg">
                  <Link href="/demo">
                    <Calendar className="mr-2 h-4 w-4" />
                    Book a Free Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                {/* Newsletter Subscribe */}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-3">
                    Or get our latest insights in your inbox:
                  </p>
                  <ProductionNewsletterForm source="popup" />
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4">
                No commitment required • No spam
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
