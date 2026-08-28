// ============================================================================
// ExamForge AI — Client-Side Context Capture
// ============================================================================
// Auto-capture browser, device, and route context for feedback.
// CLIENT-SIDE ONLY — uses window/navigator/crypto.randomUUID.
// Server code must NOT call this; use an empty object instead.
//
// NOTE: This is intentionally NOT in a 'use server' file because
// it is a synchronous client-side function that uses browser APIs.
// ============================================================================

import type { FeedbackContext } from './types'

/**
 * Auto-capture browser, device, and route context.
 * CLIENT-SIDE ONLY — uses window/navigator/crypto.randomUUID.
 * Server code must NOT call this; use an empty object instead.
 */
export function captureContext(): Partial<FeedbackContext> {
  // Server-side guard — return empty context when not in browser
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {}
  }

  try {
    const ua: string = navigator.userAgent
    const viewport = `${(window as Window).innerWidth}x${(window as Window).innerHeight}`

    // Parse browser
    let browser = 'Unknown'
    if (ua.includes('Firefox')) browser = 'Firefox'
    else if (ua.includes('Edg')) browser = 'Edge'
    else if (ua.includes('Chrome')) browser = 'Chrome'
    else if (ua.includes('Safari')) browser = 'Safari'

    // Parse device
    let device = 'Desktop'
    if (/Mobi|Android/i.test(ua)) device = 'Mobile'
    else if (/Tablet|iPad/i.test(ua)) device = 'Tablet'

    // Parse OS
    let os = 'Unknown'
    if (ua.includes('Windows')) os = 'Windows'
    else if (ua.includes('Mac OS')) os = 'macOS'
    else if (ua.includes('Linux')) os = 'Linux'
    else if (ua.includes('Android')) os = 'Android'
    else if (ua.includes('iOS') || ua.includes('iPhone')) os = 'iOS'

    return {
      route: (window as Window).location.pathname,
      browser,
      device,
      os,
      viewport,
      timestamp: new Date().toISOString(),
      sessionId: (globalThis as Record<string, unknown>).crypto !== undefined
        ? ((globalThis as Record<string, unknown>).crypto as { randomUUID?: () => string }).randomUUID?.() ?? Date.now().toString(36)
        : Date.now().toString(36),
    }
  } catch {
    return {}
  }
}
