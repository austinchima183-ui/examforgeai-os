// ============================================================================
// ExamForge AI — Register Page
// ============================================================================
// Server component that exports SEO metadata and renders the RegisterForm
// client component. The form provides its own full-page split-screen layout.
// ============================================================================

import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/pages/register-form'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your ExamForge AI account. Choose your role — student, teacher, parent, or school admin — and get started for free.',
  keywords: ['register', 'sign up', 'create account', 'ExamForge', 'exam platform'],
  openGraph: {
    title: 'Create Account — ExamForge AI',
    description: 'Join ExamForge AI — the AI-powered exam and assessment platform for modern schools.',
    type: 'website',
  },
  robots: { index: false, follow: true },
}

export default function RegisterPage() {
  return <RegisterForm />
}
