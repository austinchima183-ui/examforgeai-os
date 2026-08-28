'use client'

// ============================================================================
// ExamForge AI — Auth Error Display
// ============================================================================
// Consistent error display component for auth forms with proper ARIA.
// ============================================================================

import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

interface AuthErrorProps {
  message: string | null
  /** Optional ID for aria-describedby on the form */
  id?: string
}

export function AuthError({ message, id = 'auth-error' }: AuthErrorProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          id={id}
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: 'auto', marginBottom: 0, transition: { duration: 0.3 } }}
          exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2 } }}
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 forge-glass-surface"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
          <span className="text-sm text-destructive">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
