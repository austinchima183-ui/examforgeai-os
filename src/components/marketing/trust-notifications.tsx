'use client'

// ============================================================================
// ExamForge AI OS — Trust Notifications (Social Proof)
// ============================================================================
// Shows recent signup activity at bottom-left, rotates through notifications.
// Very subtle toast-like notifications. Glass surface, minimal.
// Each shows for 5s, then fades. Next after 3s pause. Max 4/session.
// ============================================================================

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, GraduationCap, BookOpen, X } from 'lucide-react'

interface TrustNotification {
  icon: typeof Users
  text: string
}

const notifications: TrustNotification[] = [
  { icon: GraduationCap, text: 'Lagos State University just signed up' },
  { icon: BookOpen, text: '142 schools joined this month' },
  { icon: Users, text: '2,847 students took exams today' },
  { icon: GraduationCap, text: 'Kings College upgraded to Professional' },
  { icon: BookOpen, text: 'University of Ibadan booked a demo' },
]

const SHOW_DURATION = 5000
const PAUSE_DURATION = 3000
const MAX_PER_SESSION = 4
const INITIAL_DELAY = 8000

function getInitialCount(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(sessionStorage.getItem('trust_notification_count') ?? '0', 10)
}

export function TrustNotifications() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [shownCount, setShownCount] = useState(getInitialCount)
  const [isDismissed, setIsDismissed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (shownCount >= MAX_PER_SESSION) return

    timerRef.current = setTimeout(() => {
      setIsVisible(true)
    }, INITIAL_DELAY)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [shownCount])

  useEffect(() => {
    if (!isVisible || isDismissed) return

    const hideTimer = setTimeout(() => {
      setIsVisible(false)

      const newCount = shownCount + 1
      setShownCount(newCount)
      sessionStorage.setItem(
        'trust_notification_count',
        String(newCount),
      )

      if (newCount < MAX_PER_SESSION && currentIndex < notifications.length - 1) {
        const nextTimer = setTimeout(() => {
          setCurrentIndex((prev) => prev + 1)
          setIsVisible(true)
        }, PAUSE_DURATION)

        return () => clearTimeout(nextTimer)
      }
    }, SHOW_DURATION)

    return () => clearTimeout(hideTimer)
  }, [isVisible, isDismissed, shownCount, currentIndex])

  const handleDismiss = () => {
    setIsDismissed(true)
    setIsVisible(false)
  }

  if (isDismissed || shownCount >= MAX_PER_SESSION) return null

  const notification = notifications[currentIndex]
  if (!notification) return null
  const Icon = notification.icon

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          aria-hidden="true"
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -60, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-6 left-6 z-30 max-w-[260px]"
        >
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="relative flex items-center gap-2.5 forge-glass-surface border border-white/[0.06] rounded-lg px-3 py-2.5"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/8 text-cyan-300/80 flex-shrink-0">
              <Icon className="h-3 w-3" />
            </div>
            <p className="text-xs text-foreground/70 pr-3 leading-relaxed">
              {notification.text}
            </p>
            <button
              onClick={handleDismiss}
              className="absolute top-1.5 right-1.5 text-white/15 hover:text-white/40 transition-colors duration-200"
              aria-label="Dismiss notification"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
