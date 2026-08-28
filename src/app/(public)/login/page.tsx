// ============================================================================
// ExamForge AI — Login Page (Full-Bleed)
// ============================================================================
// The login form renders its own split-screen layout (brand panel + form).
// This page exports metadata and renders the form directly, bypassing the
// centered card wrapper from (public)/layout.tsx.
// ============================================================================

import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/pages/login-form'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your ExamForge AI account to access exams, analytics, and AI-powered assessment tools.',
  keywords: ['login', 'sign in', 'ExamForge', 'exam platform', 'CBT'],
  openGraph: {
    title: 'Sign In — ExamForge AI',
    description: 'Sign in to access your AI-powered exam platform.',
    type: 'website',
  },
  robots: { index: false, follow: true },
}

export default function LoginPage() {
  return <LoginForm />
}
