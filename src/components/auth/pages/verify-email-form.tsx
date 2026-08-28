'use client'

// ============================================================================
// ExamForge AI — Premium Verify Email Form
// ============================================================================
// Stripe/Linear-quality split-screen verify email with:
//   - Animated brand panel with gradient mesh + floating particles
//   - Session check (redirect if already verified)
//   - Resend verification email via Supabase
//   - All states: checking-session, idle, resending, resend-success, error
//   - Keyboard navigation, focus management, ARIA (WCAG 2.2 AA)
//   - Responsive: split on desktop, stacked on mobile
//   - Dark mode, motion reduction, RTL-ready
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useSupabase } from '@/lib/hooks/use-supabase'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { ROUTES } from '@/lib/constants/routes'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Mail,
  Loader2,
  BookOpen,
  Sparkles,
  Shield,
  BarChart3,
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  Send,
} from 'lucide-react'
import Link from 'next/link'

// ── Animation Variants ──────────────────────────────────────────────

const formVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

const errorVariants: Variants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: { opacity: 1, height: 'auto', marginBottom: 16, transition: { duration: 0.3 } },
  exit: { opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2 } },
}

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.06 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
}

// ── Floating Particles (brand panel) ────────────────────────────────

function FloatingParticles() {
  const reducedMotion = useReducedMotion()
  if (reducedMotion) return null

  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    size: 3 + (i % 3) * 2,
    x: 10 + (i * 12) % 80,
    y: 15 + (i * 17) % 65,
    delay: i * 0.5,
    duration: 10 + (i % 3) * 3,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/20"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: [0, -15, 0],
            x: [0, (p.id % 2 === 0 ? 8 : -8), 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ── Feature List (brand panel) ──────────────────────────────────────

const features = [
  { icon: Sparkles, label: 'AI-Powered Question Generation', isAI: true },
  { icon: Shield, label: 'Enterprise-Grade Security', isAI: false },
  { icon: BarChart3, label: 'Real-Time Analytics & Insights', isAI: false },
  { icon: GraduationCap, label: 'CBT Exam Delivery Platform', isAI: false },
]

// ── Main Component ──────────────────────────────────────────────────

export function VerifyEmailForm() {
  const router = useRouter()
  const supabase = useSupabase()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const reducedMotion = useReducedMotion()

  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const supabaseAvailable = supabase !== null

  useEffect(() => {
    const checkVerification = async () => {
      if (!supabase) {
        setCheckingSession(false)
        return
      }
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user?.email_confirmed_at) {
          router.push(ROUTES.DASHBOARD)
          return
        }
      } catch {
        // If session check fails, just show the page
      } finally {
        setCheckingSession(false)
      }
    }
    checkVerification()
  }, [supabase, router])

  const handleResendVerification = useCallback(async () => {
    if (!email) {
      setError('No email address found. Please sign up again.')
      return
    }
    if (!supabase) {
      setError('Authentication service is not configured. Please connect Supabase.')
      return
    }
    setResending(true)
    setError(null)
    try {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
      if (resendError) {
        const errorMessages: Record<string, string> = {
          'For security purposes, you can only request this once every 60 seconds':
            'Please wait 60 seconds before requesting another verification email.',
        }
        setError(errorMessages[resendError.message] ?? resendError.message)
        return
      }
      setResendSuccess(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setResending(false)
    }
  }, [email, supabase])

  const viewState = checkingSession ? 'checking' : 'main'

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand Panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#090909]">
        <FloatingParticles />

        {/* AI OS ambient glow */}
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[140px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-neural/[0.03] blur-[120px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-primary/[0.02] blur-[100px]" />
        </div>
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 forge-dot-bg opacity-20" aria-hidden="true" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-20 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <span className="text-2xl font-bold text-foreground tracking-tight">ExamForge<span className="forge-gradient-text"> AI</span></span>
          </div>

          {/* Center content */}
          <div className="space-y-10">
            <div className="space-y-5">
              <h2 className="text-5xl xl:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight">
                Verify Your <span className="forge-gradient-text">Email</span>
              </h2>
              <p className="text-lg text-foreground/55 leading-relaxed max-w-lg">
                Confirm your email address to unlock full access to ExamForge AI. Check your inbox for the verification link.
              </p>
            </div>

            {/* Feature list */}
            <div className="space-y-5">
              {features.map(({ icon: Icon, label, isAI }, i) => (
                <motion.div
                  key={label}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <div className={[
                    'h-10 w-10 rounded-lg bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20',
                    isAI ? 'animate-pulse-glow' : '',
                  ].join(' ')}>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[15px] text-foreground/80 font-medium">{label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Bottom: System status — minimal */}
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-foreground/40 font-mono tracking-wide">All systems operational</span>
          </div>
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center bg-[#090909] p-6 sm:p-8 lg:p-12 xl:p-16">
        {/* Skip nav */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>

        <motion.div
          className="w-full max-w-sm"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {/* Mobile logo */}
          <motion.div className="flex items-center gap-2.5 mb-8 lg:hidden" variants={fadeUp}>
            <div className="h-10 w-10 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">ExamForge<span className="text-primary"> AI</span></span>
          </motion.div>

          <AnimatePresence mode="wait">
            {/* ── Checking Session State ── */}
            {viewState === 'checking' && (
              <motion.div
                key="checking"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6 text-center"
                aria-busy="true"
              >
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center forge-glow">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Checking verification...</h1>
                  <p className="text-sm text-foreground/55">
                    Verifying your email status. This will only take a moment.
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Main State ── */}
            {viewState === 'main' && (
              <motion.div key="main" className="space-y-0">
                {/* Dev mode banner */}
                {!supabaseAvailable && (
                  <motion.div
                    className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400"
                    variants={fadeUp}
                  >
                    Running in development mode. Connect Supabase for full authentication.
                  </motion.div>
                )}

                {/* Icon */}
                <motion.div
                  className="flex justify-center mb-6"
                  variants={fadeUp}
                >
                  <motion.div
                    className="h-16 w-16 rounded-2xl bg-primary/10 backdrop-blur-sm flex items-center justify-center border border-primary/20 forge-glow"
                    whileHover={reducedMotion ? {} : { scale: 1.05 }}
                    whileTap={reducedMotion ? {} : { scale: 0.95 }}
                  >
                    <Mail className="h-8 w-8 text-primary" aria-hidden="true" />
                  </motion.div>
                </motion.div>

                {/* Heading */}
                <motion.div className="space-y-2 mb-6 text-center" variants={fadeUp}>
                  <h1 className="text-3xl font-bold tracking-tight">Verify your email</h1>
                  <p className="text-sm text-foreground/55 leading-relaxed">
                    We&apos;ve sent a verification link to{' '}
                    {email ? <span className="font-medium text-foreground">{email}</span> : 'your email address'}.
                    Please check your inbox and click the link to activate your account.
                  </p>
                </motion.div>

                {/* Help tips */}
                <motion.div
                  className="rounded-xl border border-border/20 forge-glass-surface p-4 text-sm text-foreground/55 space-y-2 mb-6"
                  variants={fadeUp}
                >
                  <p className="font-medium text-foreground/80">Didn&apos;t receive the email?</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the correct email address</li>
                    <li>Wait a few minutes and try again</li>
                  </ul>
                </motion.div>

                {/* Resend success / Resend button */}
                <motion.div variants={fadeUp}>
                  <AnimatePresence mode="wait">
                    {resendSuccess ? (
                      <motion.div
                        key="resend-success"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                        role="status"
                        aria-live="polite"
                        className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-500/90 flex items-center justify-center gap-2 ember-glow animate-scale-in"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Verification email sent! Check your inbox.
                      </motion.div>
                    ) : (
                      <motion.div
                        key="resend-button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Button
                          variant="outline"
                          className="w-full h-12 text-sm font-medium gap-2 border-border/20 bg-transparent hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-primary/30 transition-all duration-300"
                          onClick={handleResendVerification}
                          disabled={resending || !email || !supabaseAvailable}
                          aria-label="Resend verification email"
                        >
                          {resending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              <span>Resending...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" aria-hidden="true" />
                              <span>Resend Verification Email</span>
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Error — elegant, soft destructive */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      variants={errorVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3 mt-4"
                    >
                      <p className="text-sm text-destructive/90 flex items-center gap-2.5" role="alert">
                        <svg className="h-4 w-4 flex-shrink-0 opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        {error}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Back to sign in link */}
                <motion.p className="mt-6 text-center" variants={fadeUp}>
                  <Link
                    href={ROUTES.LOGIN}
                    className="inline-flex items-center text-sm text-foreground/40 hover:text-foreground/70 transition-colors focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
                    Back to Sign In
                  </Link>
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

// ── Fallback for Suspense ───────────────────────────────────────────

export function VerifyEmailFallback() {
  return (
    <div className="min-h-screen flex">
      {/* Left brand panel placeholder */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#090909]" />

      {/* Right skeleton panel */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center bg-[#090909] p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-sm space-y-6 animate-fade-in" aria-busy="true" aria-label="Loading verification page">
          <div className="flex justify-center">
            <Skeleton className="h-16 w-16 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
      </div>
    </div>
  )
}
