// ============================================================================
// ExamForge AI — Client-Side Analytics Tracker
// ============================================================================
// Unified tracker that sends events to all configured providers.
// Supports GA4, PostHog, and custom Supabase-backed provider.
// ============================================================================

import { trackGA4Event, identifyGA4User, initGA4 } from './providers/ga4'
import { trackPostHogEvent, identifyPostHogUser, initPostHog } from './providers/posthog'
import { trackCustomEvent, identifyCustomUser, initCustomProvider, cleanupCustomProvider } from './providers/custom'
import type { AnalyticsEventName } from './events'

let sessionId: string | null = null
let utmParams: Record<string, string> = {}

/**
 * Initialize all analytics providers.
 * Call once on app mount.
 */
export function initAnalytics() {
  // Generate session ID
  if (typeof window !== 'undefined') {
    sessionId = sessionStorage.getItem('analytics_session_id') || crypto.randomUUID()
    sessionStorage.setItem('analytics_session_id', sessionId)
  }

  // Capture UTM parameters from URL on first visit
  captureUTMParams()

  // Initialize providers
  initGA4()
  initPostHog()
  initCustomProvider()
}

/**
 * Capture UTM parameters from the current URL.
 */
function captureUTMParams() {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']

  let hasUtm = false
  for (const key of utmKeys) {
    const value = url.searchParams.get(key)
    if (value) {
      utmParams[key] = value
      hasUtm = true
    }
  }

  // Store UTM params in sessionStorage for cross-page persistence
  if (hasUtm) {
    sessionStorage.setItem('utm_params', JSON.stringify(utmParams))
  } else {
    // Restore from sessionStorage if available
    const stored = sessionStorage.getItem('utm_params')
    if (stored) {
      try {
        utmParams = JSON.parse(stored)
      } catch {
        // Ignore invalid stored data
      }
    }
  }
}

/**
 * Track an event across all configured providers.
 */
export function trackEvent(
  eventName: AnalyticsEventName | string,
  properties?: Record<string, unknown>
) {
  // Merge UTM params into properties
  const enrichedProperties = {
    ...properties,
    ...utmParams,
    session_id: sessionId,
  }

  // Send to all providers
  trackGA4Event(eventName, enrichedProperties)
  trackPostHogEvent(eventName, enrichedProperties)
  trackCustomEvent(eventName, enrichedProperties)
}

/**
 * Track a page view.
 */
export function trackPageView() {
  if (typeof window === 'undefined') return

  trackEvent('page_view', {
    path: window.location.pathname,
    title: document.title,
    referrer: document.referrer,
    search: window.location.search,
  })
}

/**
 * Identify a user across all providers.
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  identifyGA4User(userId, traits)
  identifyPostHogUser(userId, traits)
  identifyCustomUser(userId, traits)
}

/**
 * Cleanup analytics (call on app unmount).
 */
export function cleanupAnalytics() {
  cleanupCustomProvider()
}

/**
 * Get stored UTM parameters.
 */
export function getUTMParams(): Record<string, string> {
  return { ...utmParams }
}

/**
 * Get the current session ID.
 */
export function getSessionId(): string | null {
  return sessionId
}
