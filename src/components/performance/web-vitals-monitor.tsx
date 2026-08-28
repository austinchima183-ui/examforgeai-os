'use client'

import { useEffect } from 'react'
import { initWebVitals } from '@/lib/performance/core-web-vitals'

// ============================================================================
// ExamForge AI — Web Vitals Monitor (Client Component)
// ============================================================================
// Thin client component that initialises Core Web Vitals monitoring on mount.
// Imported in the root layout so it runs once per page load.
// ============================================================================

export function WebVitalsMonitor() {
  useEffect(() => {
    initWebVitals()
  }, [])

  return null
}
