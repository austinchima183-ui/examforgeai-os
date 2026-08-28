// ============================================================================
// ExamForge AI — Forgot Password Page
// ============================================================================
// Server component that exports SEO metadata and renders the
// ForgotPasswordForm client component.
// ============================================================================

import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/pages/forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Reset your ExamForge AI password. Enter your email and we\'ll send you a link to set a new password.',
  keywords: ['forgot password', 'reset password', 'ExamForge'],
  openGraph: {
    title: 'Forgot Password — ExamForge AI',
    description: 'Reset your ExamForge AI password.',
    type: 'website',
  },
  robots: { index: false, follow: true },
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
