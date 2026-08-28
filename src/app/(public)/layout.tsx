// ============================================================================
// ExamForge AI — Public Layout
// ============================================================================
// Layout for unauthenticated routes (login, register, forgot-password, etc.)
// Minimal wrapper — individual auth pages render their own split-screen layouts.
// Background: #090909 with subtle ambient gradients.
// Design tokens: Forge Indigo (primary), Ember Amber (knowledge), Neural Cyan (AI).
// ============================================================================

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'ExamForge AI — AI-Powered Exam & Assessment Platform',
    template: '%s — ExamForge AI',
  },
  description: 'ExamForge AI is the AI-powered exam creation and assessment platform for modern schools. Sign in or create an account to get started.',
  keywords: ['ExamForge', 'exam platform', 'CBT', 'AI assessment', 'school management', 'Nigeria'],
  openGraph: {
    title: 'ExamForge AI — AI-Powered Exam & Assessment Platform',
    description: 'One platform to manage schools, run CBT exams, automate administration, and empower learning with AI.',
    type: 'website',
    siteName: 'ExamForge AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ExamForge AI',
    description: 'AI-Powered Exam Creation & Assessment Platform',
  },
}

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-[#090909]">
      {/* Skip navigation link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>

      {/* Ambient gradient — very subtle */}
      <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-64 -right-64 h-[400px] w-[400px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute -bottom-64 -left-64 h-[400px] w-[400px] rounded-full bg-neural/[0.02] blur-[120px]" />
      </div>

      {children}
    </div>
  )
}
