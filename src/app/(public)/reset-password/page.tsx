// ============================================================================
// ExamForge AI — Reset Password Page
// ============================================================================
// Server component that exports SEO metadata and renders the
// ResetPasswordForm client component.
// ============================================================================

import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/components/auth/pages/reset-password-form'

export const metadata: Metadata = {
  title: 'Set New Password',
  description: 'Set your new password for ExamForge AI. This page is accessed via the password reset email link.',
  keywords: ['reset password', 'new password', 'ExamForge'],
  openGraph: {
    title: 'Set New Password — ExamForge AI',
    description: 'Set your new ExamForge AI password.',
    type: 'website',
  },
  robots: { index: false, follow: true },
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
