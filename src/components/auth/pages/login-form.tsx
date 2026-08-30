'use client'

// ============================================================================
// ExamForge AI — Premium Login Form
// ============================================================================
// Stripe/Linear-quality split-screen login with:
//   - Animated brand panel with gradient mesh + floating particles
//   - Social auth (Google, Apple) with real Supabase OAuth
//   - Email/password via loginAction server action
//   - Password visibility toggle, form validation (react-hook-form + zod)
//   - All states: idle, loading, error, success, social-loading
//   - Keyboard navigation, focus management, ARIA (WCAG 2.2 AA)
//   - Responsive: split on desktop, stacked on mobile
//   - Dark mode, motion reduction, RTL-ready
// ============================================================================

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useSupabase } from '@/lib/hooks/use-supabase'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { loginSchema, type LoginInput } from '@/lib/validators/auth'
import { loginAction } from '@/features/auth/actions/login.action'
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
  Lock,
  Loader2,
  Eye,
  EyeOff,
  BookOpen,
  Sparkles,
  Shield,
  BarChart3,
  GraduationCap,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

// ── Animation Variants ──────────────────────────────────────────────

const errorVariants: Variants = {
  hidden: { opacity: 0, height: 0, marginBottom: 0 },
  visible: { opacity: 1, height: 'auto', marginBottom: 16, transition: { duration: 0.3 } },
  exit: { opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.2 } },
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

export function LoginForm() {
  const router = useRouter()
  const supabase = useSupabase()
  const { initialize } = useAuthStore()
  const reducedMotion = useReducedMotion()
  const emailRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<string | null>(null)
  const [hoverSubmit, setHoverSubmit] = useState(false)
  const supabaseAvailable = supabase !== null

  // Auto-focus email on mount
  useEffect(() => {
    const timer = setTimeout(() => emailRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [])

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = useCallback(async (values: LoginInput) => {
    setError(null)
    setLoading(true)
    try {
      const result = await loginAction(values)
      if (!result.success) {
        setError(result.error ?? 'Login failed. Please try again.')
        return
      }
      if (result.user) {
        initialize(result.user)
        router.push(ROUTES.DASHBOARD)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [initialize, router])

  const handleSocialLogin = useCallback(async (provider: 'google' | 'apple') => {
    if (!supabase) return
    setError(null)
    setSocialLoadingProvider(provider)
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}${ROUTES.AUTH_CALLBACK}` },
      })
      if (authError) setError(authError.message)
    } catch {
      setError('An unexpected error occurred during social login.')
    } finally {
      setSocialLoadingProvider(null)
    }
  }, [supabase])

  // CSS-driven entrance (tailwindcss-animate) — content paints immediately
  // from SSR HTML instead of waiting for framer-motion hydration. This moves
  // LCP from "after JS evaluation" to "first contentful paint".
  // framer-motion is still used for exit/error micro-interactions below.
  const formEntranceClass = reducedMotion
    ? ''
    : 'animate-in fade-in slide-in-from-bottom-4 [animation-duration:450ms] [animation-fill-mode:backwards]'

  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand Panel (desktop only) ── */}
      <aside className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#090909]" aria-label="ExamForge AI platform introduction">
        <FloatingParticles />

        {/* AI OS ambient glow — more subtle, immersive */}
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
                The Operating System for <span className="forge-gradient-text">Modern Education</span>
              </h2>
              <p className="text-lg text-foreground/55 leading-relaxed max-w-lg">
                Create exams, deliver CBT, auto-mark with AI, and generate insights — all from one platform.
              </p>
            </div>

            {/* Feature list — animated icons */}
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
            <span className="text-xs text-muted-foreground/60 font-mono tracking-wide">All systems operational</span>
          </div>
        </div>
      </aside>

      {/* ── Right: Form Panel ── */}
      <main id="main-content" tabIndex={-1} className="w-full lg:w-[45%] flex flex-col items-center justify-center bg-[#090909] p-6 sm:p-8 lg:p-12 xl:p-16 focus:outline-none">
        {/* Skip nav */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>

        {/* CSS-driven entrance — paints from SSR HTML without waiting for
            framer-motion hydration (keeps LCP at first paint on mobile). */}
        <div className="w-full max-w-sm animate-in fade-in [animation-duration:400ms]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/30">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">ExamForge<span className="text-primary"> AI</span></span>
          </div>

          {/* Heading — large, confident */}
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-foreground/55">
              Sign in to your account to continue
            </p>
          </div>

          {/* Dev mode banner */}
          {!supabaseAvailable && (
            <motion.div
              className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400"
              variants={fadeUp}
            >
              Running in development mode. Connect Supabase for full authentication.
            </motion.div>
          )}

          {/* Social auth — premium buttons */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-2.5 text-sm font-medium border-border/20 bg-transparent hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-primary/30 transition-all duration-300"
                onClick={() => handleSocialLogin('google')}
                disabled={socialLoadingProvider !== null || !supabaseAvailable}
                aria-label="Sign in with Google"
              >
                {socialLoadingProvider === 'google' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-2.5 text-sm font-medium border-border/20 bg-transparent hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-primary/30 transition-all duration-300"
                onClick={() => handleSocialLogin('apple')}
                disabled={socialLoadingProvider !== null || !supabaseAvailable}
                aria-label="Sign in with Apple"
              >
                {socialLoadingProvider === 'apple' ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.14 5.5 7.39 9.39 7c1.09.05 1.86.6 2.49 1.14.66.56 1.3.58 2.07.03.9-.62 1.77-.84 2.71-.3 1.56.9 2.18 3.84.54 8.16-.55 1.58-1.72 3.14-2.15 4.25z" />
                    <path d="M14.54 3.27c.11 1.83-.8 3.38-2.05 4.47-1.22 1.06-2.84 1.7-4.12 1.5-.13-1.74.82-3.4 2.02-4.41 1.24-1.06 2.95-1.72 4.15-1.56z" />
                  </svg>
                )}
                Apple
              </Button>
            </div>

            {/* Divider — ultra subtle */}
            <div className="relative" aria-hidden="true">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#090909] px-3 text-muted-foreground lowercase tracking-wide">
                  or continue with email
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className={formEntranceClass}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" aria-label="Sign in with email form">
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

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-sm font-medium text-foreground/80">Password</FormLabel>
                        <Link
                          href={ROUTES.FORGOT_PASSWORD}
                          className="text-xs text-foreground/60 hover:text-foreground/70 transition-colors focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <div className="relative forge-input-glow rounded-xl">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your password"
                            className="h-12 pl-10 pr-10 text-sm bg-[#1D1D1D]/50 border-border/20 rounded-xl placeholder:text-muted-foreground/40"
                            autoComplete="current-password"
                            aria-required="true"
                            disabled={loading}
                            {...field}
                          />
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" aria-hidden="true" />
                          <button
                            type="button"
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            tabIndex={0}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
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

                {/* Submit — premium button with glow + animated arrow */}
                <Button
                  type="submit"
                  className="w-full h-12 text-sm font-semibold gap-2 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300"
                  disabled={loading}
                  onMouseEnter={() => setHoverSubmit(true)}
                  onMouseLeave={() => setHoverSubmit(false)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <motion.div
                        animate={{ x: hoverSubmit ? 3 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </motion.div>
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>

          {/* Register link */}
          <motion.p className="mt-8 text-center text-sm text-foreground/60" variants={fadeUp}>
            Don&apos;t have an account?{' '}
            <Link
              href={ROUTES.REGISTER}
              className="font-medium text-foreground hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
            >
              Create an account
            </Link>
          </motion.p>
        </div>
      </main>
    </div>
  )
}
