// ============================================================================
// ExamForge AI — Verify Email Page
// ============================================================================
// Server component that exports SEO metadata and renders the
// VerifyEmailForm client component wrapped in Suspense for streaming SSR.
// ============================================================================

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { VerifyEmailForm, VerifyEmailFallback } from '@/components/auth/pages/verify-email-form'

export const metadata: Metadata = {
  title: 'Verify Email',
  description: 'Verify your email address for ExamForge AI. Check your inbox for the verification link.',
  keywords: ['verify email', 'email confirmation', 'ExamForge'],
  openGraph: {
    title: 'Verify Email — ExamForge AI',
    description: 'Verify your ExamForge AI email address.',
    type: 'website',
  },
  robots: { index: false, follow: true },
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailForm />
    </Suspense>
  )
}
