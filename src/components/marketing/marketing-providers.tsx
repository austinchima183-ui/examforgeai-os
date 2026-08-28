'use client'

// ============================================================================
// ExamForge AI — Marketing Providers
// ============================================================================
// Client component wrapper that wraps children with AnalyticsProvider,
// MotionProvider (reduced motion support), and renders floating UI elements
// (lazily loaded with next/dynamic).
// ============================================================================

import dynamic from 'next/dynamic'
import { AnalyticsProvider } from '@/components/marketing/analytics-provider'
import { MotionProvider, ReducedMotionStyles } from '@/components/marketing/motion'

// Lazy-load heavy interactive components to avoid blocking initial paint
const ExitIntentPopup = dynamic(
  () =>
    import('@/components/marketing/exit-intent-popup').then(
      (mod) => mod.ExitIntentPopup,
    ),
  { ssr: false },
)

const TrustNotifications = dynamic(
  () =>
    import('@/components/marketing/trust-notifications').then(
      (mod) => mod.TrustNotifications,
    ),
  { ssr: false },
)

const FloatingDemoButton = dynamic(
  () =>
    import('@/components/marketing/floating-demo-button').then(
      (mod) => mod.FloatingDemoButton,
    ),
  { ssr: false },
)

export function MarketingProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MotionProvider>
      <AnalyticsProvider>
        {children}
        <ExitIntentPopup />
        <TrustNotifications />
        <FloatingDemoButton />
      </AnalyticsProvider>
      <ReducedMotionStyles />
    </MotionProvider>
  )
}
