'use client'

// ============================================================================
// ExamForge AI — Auth Card Layout
// ============================================================================
// Shared centered-card layout for auth pages that don't use the split-screen
// design (forgot-password, reset-password, verify-email, etc.)
// Provides: logo, centered card, subtle gradient background, responsive.
// ============================================================================

import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'

export function AuthCardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <header className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight">ExamForge<span className="forge-gradient-text"> AI</span></span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            AI-Powered Exam Creation &amp; Assessment Platform
          </p>
        </header>

        {/* Card */}
        <motion.main
          id="main-content"
          tabIndex={-1}
          className="rounded-xl border border-border/30 forge-glass-surface forge-card-shadow p-6 sm:p-8 focus:outline-none"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {children}
        </motion.main>

        {/* Footer */}
        <footer className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} ExamForge AI. All rights reserved.
        </footer>
      </div>
    </div>
  )
}
