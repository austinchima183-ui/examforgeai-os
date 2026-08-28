'use client'

// ============================================================================
// ExamForge AI — Analytics Provider Component
// ============================================================================
// Initializes analytics on mount, sets up scroll depth tracking,
// captures UTM parameters, provides trackEvent/trackPageView/identifyUser
// via React context. Exports AnalyticsContext for use-analytics hook.
// ============================================================================

import {
  useEffect, createContext, useContext, useCallback, useRef, type ReactNode,
} from 'react'
import {
  initAnalytics, trackEvent as trackerTrackEvent,
  trackPageView as trackerTrackPageView,
  identifyUser as trackerIdentifyUser,
  cleanupAnalytics, getUTMParams,
} from '@/lib/analytics/tracker'
import { AnalyticsEvents } from '@/lib/analytics/events'

interface AnalyticsContextValue {
  trackEvent: (name: string, properties?: Record<string, unknown>) => void
  trackPageView: () => void
  identifyUser: (userId: string, traits?: Record<string, unknown>) => void
  getUTMParams: () => Record<string, string>
  AnalyticsEvents: typeof AnalyticsEvents
}

export const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Initialize analytics and track first page view
    initAnalytics()
    trackerTrackPageView()

    // ── Scroll depth tracking ──
    const scrollDepths = new Set<number>()
    const depthThresholds = [25, 50, 75, 100]

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      const scrollHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight
      if (scrollHeight === 0) return

      const scrollPercent = Math.round((scrollTop / scrollHeight) * 100)

      for (const threshold of depthThresholds) {
        if (scrollPercent >= threshold && !scrollDepths.has(threshold)) {
          scrollDepths.add(threshold)
          trackerTrackEvent(AnalyticsEvents.SCROLL_DEPTH, {
            depth: threshold,
            path: window.location.pathname,
          })
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // ── Track SPA navigation ──
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState

    history.pushState = function (...args) {
      originalPushState.apply(this, args)
      trackerTrackPageView()
    }

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args)
      trackerTrackPageView()
    }

    const handlePopState = () => trackerTrackPageView()
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('popstate', handlePopState)
      history.pushState = originalPushState
      history.replaceState = originalReplaceState
      cleanupAnalytics()
    }
  }, [])

  const trackEvent = useCallback(
    (name: string, properties?: Record<string, unknown>) => {
      trackerTrackEvent(name, properties)
    },
    [],
  )

  const trackPageView = useCallback(() => {
    trackerTrackPageView()
  }, [])

  const identifyUser = useCallback(
    (userId: string, traits?: Record<string, unknown>) => {
      trackerIdentifyUser(userId, traits)
    },
    [],
  )

  const contextValue: AnalyticsContextValue = {
    trackEvent,
    trackPageView,
    identifyUser,
    getUTMParams,
    AnalyticsEvents,
  }

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext)
  if (!context) {
    // Return no-op implementation if not wrapped in provider
    return {
      trackEvent: () => {},
      trackPageView: () => {},
      identifyUser: () => {},
      getUTMParams: () => ({}),
      AnalyticsEvents,
    }
  }
  return context
}
