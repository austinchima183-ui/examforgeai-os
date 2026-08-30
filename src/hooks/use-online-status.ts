'use client'

import { useEffect, useState } from 'react'

// ============================================================================
// ExamForge AI — Online Status Hook (Dashboard UX)
// ============================================================================
// SSR-safe navigator.onLine tracking with online/offline event listeners.
// Used by the widget toolbar connection indicator (WCAG 4.1.3 announcements).
// ============================================================================

export interface OnlineStatus {
  online: boolean
  /** True once the first client-side reading has happened (avoids SSR flash) */
  ready: boolean
}

export function useOnlineStatus(): OnlineStatus {
  // Default to online during SSR so the indicator never flashes red on load.
  const [online, setOnline] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    setReady(true)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return { online, ready }
}
