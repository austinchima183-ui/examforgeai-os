'use client'

// ============================================================================
// ExamForge AI — Premium Forgot Password Form
// ============================================================================
// Stripe/Linear-quality split-screen forgot password with:
//   - Animated brand panel with gradient mesh + floating particles
//   - Email input via Supabase resetPasswordForEmail
//   - Form validation (react-hook-form + zod)
//   - All states: idle, loading, error, success
//   - Keyboard navigation, focus management, ARIA (WCAG 2.2 AA)
//   - Responsive: split on desktop, stacked on mobile
//   - Dark mode, motion reduction, RTL-ready
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useSupabase } from '@/lib/hooks/use-supabase'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validators/auth'
import { ROUTES } from '@/lib/constants/routes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
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
  ArrowRight,
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

export function ForgotPasswordForm() {
  const supabase = useSupabase()
  const reducedMotion = useReducedMotion()
  const emailRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [hoverSubmit, setHoverSubmit] = useState(false)
  const supabaseAvailable = supabase !== null

  // Auto-focus email on mount
  useEffect(() => {
    if (!success) {
      const timer = setTimeout(() => emailRef.current?.focus(), 300)
      return () => clearTimeout(timer)
    }
  }, [success])

  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = useCallback(async (values: ResetPasswordInput) => {
    setError(null)
    setLoading(true)

    if (!supabase) {
      setLoading(false)
      setError('Authentication service is not configured. Please connect Supabase to reset your password.')
      return
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        values.email,
        { redirectTo: `${window.location.origin}${ROUTES.RESET_PASSWORD}` }
      )

      if (resetError) {
        const errorMessages: Record<string, string> = {
          'For security purposes, you can only request this once every 60 seconds':
            'Please wait 60 seconds before requesting another reset link.',
        }
        setError(errorMessages[resetError.message] ?? resetError.message)
        return
      }

      setSubmittedEmail(values.email)
      setSuccess(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const animProps = reducedMotion ? {} : { variants: formVariants, initial: 'hidden', animate: 'visible', exit: 'exit' }

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
                Reset Your <span className="forge-gradient-text">Password</span>
              </h2>
              <p className="text-lg text-foreground/55 leading-relaxed max-w-lg">
                Enter your email and we&apos;ll send you a secure link to set a new password. Your account stays safe throughout the process.
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
            <span className="text-xs text-foreground/60 font-mono tracking-wide">All systems operational</span>
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

          {/* ── Success State ── */}
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                {/* Success icon */}
                <motion.div
                  className="flex justify-center"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                >
                  <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center ember-glow animate-scale-in">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" aria-hidden="true" />
                  </div>
                </motion.div>

                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
                  <p className="text-sm text-foreground/55 leading-relaxed">
                    If an account exists for{' '}
                    <span className="font-medium text-foreground">{submittedEmail}</span>,
                    we&apos;ve sent a password reset link. Click the link in the email to set a new password.
                  </p>
                </div>

                <div className="rounded-xl border border-border/20 forge-glass-surface p-4 text-sm text-foreground/55">
                  <p>Didn&apos;t receive the email? Check your spam folder or{' '}
                    <button
                      onClick={() => { setSuccess(false); form.reset() }}
                      className="text-primary hover:underline font-medium focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      aria-label="Try sending the reset link again"
                    >
                      try again
                    </button>.
                  </p>
                </div>

                <Button
                  asChild
                  className="w-full h-12 text-sm font-semibold gap-2 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300"
                >
                  <Link href={ROUTES.LOGIN}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Back to Sign In</span>
                  </Link>
                </Button>
              </motion.div>
            ) : (
              /* ── Form State ── */
              <motion.div key="form" className="space-y-0">
                {/* Heading */}
                <motion.div className="space-y-2 mb-8" variants={fadeUp}>
                  <h1 className="text-3xl font-bold tracking-tight">Forgot your password?</h1>
                  <p className="text-sm text-foreground/55">
                    Enter your email address and we&apos;ll send you a link to reset your password.
                  </p>
                </motion.div>

                {/* Dev mode banner */}
                {!supabaseAvailable && (
                  <motion.div
                    className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400"
                    variants={fadeUp}
                  >
                    Running in development mode. Connect Supabase for full authentication.
                  </motion.div>
                )}

                {/* Form */}
                <motion.div {...animProps}>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" aria-label="Forgot password form">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground/80">Email</FormLabel>
                            <FormControl>
                              <div className="relative forge-input-glow rounded-xl">
                                <Input
                                  type="email"
                                  placeholder="you@school.edu"
                                  className="h-12 pl-10 text-sm bg-[#1D1D1D]/50 border-border/20 rounded-xl placeholder:text-muted-foreground/40"
                                  autoComplete="email"
                                  aria-required="true"
                                  disabled={loading}
                                  {...field}
                                  ref={(node: HTMLInputElement) => {
                                    field.ref(node)
                                    emailRef.current = node
                                  }}
                                />
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" aria-hidden="true" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Error — elegant, soft destructive */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            variants={errorVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="rounded-xl border border-destructive/20 bg-destructive/[0.06] px-4 py-3"
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

                      {/* Submit — premium button */}
                      <Button
                        type="submit"
                        className="w-full h-12 text-sm font-semibold gap-2 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300"
                        disabled={loading || !supabaseAvailable}
                        onMouseEnter={() => setHoverSubmit(true)}
                        onMouseLeave={() => setHoverSubmit(false)}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            <span>Sending reset link...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" aria-hidden="true" />
                            <span>Send Reset Link</span>
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </motion.div>

                {/* Back to sign in link */}
                <motion.p className="mt-6 text-center" variants={fadeUp}>
                  <Link
                    href={ROUTES.LOGIN}
                    className="inline-flex items-center text-sm text-foreground/60 hover:text-foreground/70 transition-colors focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
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
