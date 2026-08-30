'use client'

// ============================================================================
// ExamForge AI — Premium Register Form
// ============================================================================
// Stripe/Linear-quality split-screen registration with:
//   - Animated brand panel with gradient mesh + floating particles
//   - Beautiful card-style role selection (Student, Teacher, Parent, Admin)
//   - Social auth (Google, Apple) with real Supabase OAuth
//   - Email/password via signupAction server action
//   - Password visibility toggles, form validation (react-hook-form + zod)
//   - All states: idle, loading, error, success, social-loading
//   - Animated success state (email verification sent)
//   - Multi-step progressive disclosure with animated transitions
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
import { useReducedMotion } from '@/hooks/use-reduced-motion'
import { signupSchema, type SignupInput } from '@/lib/validators/auth'
import { signupAction } from '@/features/auth/actions/signup.action'
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
  FormDescription,
} from '@/components/ui/form'
import {
  Mail,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
  BookOpen,
  BarChart3,
  GraduationCap,
  ArrowRight,
  Brain,
  Cpu,
  Globe,
  School,
  Users,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import type { UserRole } from '@/lib/types'

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

const successVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

const checkVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 },
  },
}

const stepVariants: Variants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: -20, transition: { duration: 0.25 } },
}

// ── Floating Particles (brand panel) ────────────────────────────────

function FloatingParticles() {
  const reducedMotion = useReducedMotion()
  if (reducedMotion) return null

  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    size: 3 + (i % 4) * 2,
    x: 10 + (i * 13) % 75,
    y: 15 + (i * 19) % 65,
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
            y: [0, -18, 0],
            x: [0, (p.id % 2 === 0 ? 10 : -10), 0],
            opacity: [0.15, 0.4, 0.15],
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
  { icon: Brain, label: 'AI-Generated Exams in Seconds', isAI: true },
  { icon: Cpu, label: 'Auto-Marking with Intelligent Feedback', isAI: false },
  { icon: Globe, label: 'CBT Delivery for Any Device', isAI: false },
  { icon: BarChart3, label: 'Actionable Performance Analytics', isAI: false },
]

// ── Role Options ────────────────────────────────────────────────────

const ROLE_OPTIONS: {
  value: UserRole
  label: string
  description: string
  icon: typeof GraduationCap
}[] = [
  {
    value: 'student',
    label: 'Student',
    description: 'Take exams & track progress',
    icon: GraduationCap,
  },
  {
    value: 'teacher',
    label: 'Teacher',
    description: 'Create & grade exams',
    icon: BookOpen,
  },
  {
    value: 'parent',
    label: 'Parent',
    description: 'Monitor child results',
    icon: Users,
  },
  {
    value: 'school_admin',
    label: 'Admin',
    description: 'Manage school & staff',
    icon: School,
  },
]

// ── Animated Checkmark ──────────────────────────────────────────────

function AnimatedCheckmark() {
  return (
    <motion.div
      className="h-20 w-20 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center neural-glow animate-scale-in"
      variants={successVariants}
      initial="hidden"
      animate="visible"
    >
      <svg
        className="h-10 w-10 text-emerald-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <motion.path
          d="M5 12l5 5L20 7"
          variants={checkVariants}
          initial="hidden"
          animate="visible"
        />
      </svg>
    </motion.div>
  )
}

// ── Brand Panel (shared) ────────────────────────────────────────────

function BrandPanel({ headline, subheadline }: { headline: React.ReactNode; subheadline: string }) {
  return (
    <aside className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-[#090909]" aria-label="ExamForge AI platform introduction">
      <FloatingParticles />
      {/* AI OS ambient glow */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-neural/[0.03] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full bg-primary/[0.02] blur-[100px]" />
      </div>
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
              {headline}
            </h2>
            <p className="text-lg text-foreground/55 leading-relaxed max-w-lg">
              {subheadline}
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
          <span className="text-xs text-foreground/60 font-mono tracking-wide">All systems operational</span>
        </div>
      </div>
    </aside>
  )
}

// ── Main Component ──────────────────────────────────────────────────

export function RegisterForm() {
  const supabase = useSupabase()
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const nameRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('student')
  const [socialLoadingProvider, setSocialLoadingProvider] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [step, setStep] = useState<1 | 2>(1) // 1 = role, 2 = form details
  const [hoverSubmit, setHoverSubmit] = useState(false)

  const supabaseAvailable = supabase !== null

  // Auto-focus first field on mount
  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 300)
    return () => clearTimeout(timer)
  }, [])

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'student',
    },
  })

  const handleRoleChange = useCallback((role: UserRole) => {
    setSelectedRole(role)
    form.setValue('role', role as SignupInput['role'], { shouldValidate: true })
  }, [form])

  const handleRoleContinue = useCallback(() => {
    setStep(2)
  }, [])

  const onSubmit = useCallback(async (values: SignupInput) => {
    setError(null)
    setLoading(true)

    try {
      const result = await signupAction(values)

      if (!result.success) {
        setError(result.error ?? 'Registration failed. Please try again.')
        return
      }

      if (result.user) {
        if (result.emailConfirmationRequired) {
          // Email verification pending — show the confirmation notice
          setRegisteredEmail(values.email)
          setSuccess(true)
        } else {
          // Auto-confirmed (Supabase mailer_autoconfirm) — the session is
          // established by the server action. Route straight to the app.
          router.push('/dashboard')
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSocialLogin = useCallback(async (provider: 'google' | 'apple') => {
    if (!supabase) return
    setError(null)
    setSocialLoadingProvider(provider)

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${ROUTES.AUTH_CALLBACK}`,
        },
      })

      if (authError) {
        setError(authError.message)
      }
    } catch {
      setError('An unexpected error occurred during social login.')
    } finally {
      setSocialLoadingProvider(null)
    }
  }, [supabase])

  const animProps = reducedMotion
    ? {}
    : { variants: formVariants, initial: 'hidden', animate: 'visible', exit: 'exit' }

  // ── Success State ───────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex">
        <BrandPanel
          headline={<>You&apos;re almost <span className="forge-gradient-text">there</span>!</>}
          subheadline="Just one more step — verify your email and you'll be creating your first exam in no time."
        />

        {/* Success panel */}
        <main id="main-content" tabIndex={-1} className="w-full lg:w-[45%] flex flex-col items-center justify-center bg-[#090909] p-6 sm:p-8 lg:p-12 focus:outline-none">
          <motion.div
            className="w-full max-w-sm space-y-6 text-center"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="flex justify-center" variants={fadeUp}>
              <AnimatedCheckmark />
            </motion.div>

            <motion.div className="space-y-2" variants={fadeUp}>
              <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
              <p className="text-sm text-foreground/55">
                We&apos;ve sent a verification link to{' '}
                <span className="font-medium text-foreground">{registeredEmail}</span>.
                Please check your inbox and click the link to verify your account.
              </p>
            </motion.div>

            <motion.div
              className="rounded-xl border border-border/20 forge-glass-surface p-4 text-sm text-foreground/55 space-y-1"
              variants={fadeUp}
            >
              <p className="font-medium text-foreground">Didn&apos;t receive the email?</p>
              <p>
                Check your spam folder or{' '}
                <button
                  onClick={() => {
                    setSuccess(false)
                    form.reset()
                  }}
                  className="text-primary hover:underline font-medium focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  aria-label="Try registering again"
                >
                  try again
                </button>.
              </p>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Button asChild className="w-full h-12 text-sm font-semibold gap-2 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300">
                <Link href={ROUTES.LOGIN}>
                  <span>Back to Sign In</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </main>
      </div>
    )
  }

  // ── Main Form ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* ── Left: Brand Panel ── */}
      <BrandPanel
        headline={<>Join the Future of <span className="forge-gradient-text">Education</span></>}
        subheadline="Create exams with AI, deliver CBT on any device, auto-mark in seconds, and get insights that matter."
      />

      {/* ── Right: Form Panel ── */}
      <main id="main-content" tabIndex={-1} className="w-full lg:w-[45%] flex flex-col items-center justify-center bg-[#090909] p-6 sm:p-8 lg:p-12 xl:p-16 focus:outline-none">
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

          {/* Step indicator */}
          <motion.div className="flex items-center gap-2 mb-6" variants={fadeUp}>
            <div className={[
              'h-1.5 rounded-full transition-all duration-300',
              step === 1 ? 'w-8 bg-primary' : 'w-4 bg-primary/30',
            ].join(' ')} />
            <div className={[
              'h-1.5 rounded-full transition-all duration-300',
              step === 2 ? 'w-8 bg-primary' : 'w-4 bg-primary/30',
            ].join(' ')} />
          </motion.div>

          <AnimatePresence mode="wait">
            {/* ── Step 1: Role Selection ── */}
            {step === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-0"
              >
                {/* Heading */}
                <motion.div className="space-y-2 mb-6" variants={fadeUp}>
                  <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
                  <p className="text-sm text-foreground/55">
                    Tell us how you&apos;ll use ExamForge AI
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

                {/* Role Selection — premium glass cards */}
                <motion.div className="mb-6" variants={fadeUp}>
                  <fieldset className="space-y-3" disabled={loading}>
                    <legend className="text-sm font-medium leading-none mb-1 text-foreground/80">
                      I am a...
                    </legend>
                    <div
                      className="grid grid-cols-2 gap-3"
                      role="radiogroup"
                      aria-label="Select your role"
                    >
                      {ROLE_OPTIONS.map((roleOpt) => {
                        const isSelected = selectedRole === roleOpt.value
                        const Icon = roleOpt.icon
                        return (
                          <motion.button
                            key={roleOpt.value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={roleOpt.label}
                            onClick={() => handleRoleChange(roleOpt.value)}
                            whileTap={reducedMotion ? {} : { scale: 0.97 }}
                            whileHover={reducedMotion ? {} : { scale: 1.02, y: -2 }}
                            className={[
                              'group relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-300',
                              'forge-glass-surface forge-card-shadow',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                              isSelected
                                ? 'border-primary forge-glow'
                                : 'border-border/20 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-primary/30',
                              loading && 'cursor-not-allowed opacity-50',
                            ].join(' ')}
                          >
                            <div className={[
                              'flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200',
                              'backdrop-blur-sm border',
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary/30'
                                : 'bg-primary/5 text-muted-foreground border-border/20 group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20',
                            ].join(' ')}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <span className={[
                              'text-sm font-semibold transition-colors duration-200',
                              isSelected ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                            ].join(' ')}>
                              {roleOpt.label}
                            </span>
                            <span className="text-[10px] leading-tight text-foreground/60 sm:text-xs">
                              {roleOpt.description}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>
                  </fieldset>
                </motion.div>

                {/* Continue button */}
                <motion.div variants={fadeUp}>
                  <Button
                    type="button"
                    className="w-full h-12 text-sm font-semibold gap-2 hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300"
                    onClick={handleRoleContinue}
                    onMouseEnter={() => setHoverSubmit(true)}
                    onMouseLeave={() => setHoverSubmit(false)}
                  >
                    <span>Continue</span>
                    <motion.div
                      animate={{ x: hoverSubmit ? 3 : 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </motion.div>
                  </Button>
                </motion.div>

                {/* Social auth on step 1 */}
                <motion.div className="mt-6" variants={fadeUp}>
                  <div className="relative mb-4" aria-hidden="true">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/40" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[#090909] px-3 text-foreground/60 lowercase tracking-wide">
                        or sign up with
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 gap-2.5 text-sm font-medium border-border/20 bg-transparent hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-primary/30 transition-all duration-300"
                      onClick={() => handleSocialLogin('google')}
                      disabled={socialLoadingProvider !== null || !supabaseAvailable}
                      aria-label="Sign up with Google"
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
                      aria-label="Sign up with Apple"
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
                </motion.div>

                {/* Login link */}
                <motion.p className="mt-6 text-center text-sm text-foreground/60" variants={fadeUp}>
                  Already have an account?{' '}
                  <Link
                    href={ROUTES.LOGIN}
                    className="font-medium text-foreground hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    Sign in
                  </Link>
                </motion.p>
              </motion.div>
            )}

            {/* ── Step 2: Form Details ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-0"
              >
                {/* Heading */}
                <motion.div className="space-y-2 mb-6" variants={fadeUp}>
                  <h1 className="text-3xl font-bold tracking-tight">Your details</h1>
                  <p className="text-sm text-foreground/55">
                    Fill in your information to create your {ROLE_OPTIONS.find(r => r.value === selectedRole)?.label.toLowerCase()} account
                  </p>
                </motion.div>

                {/* Form */}
                <motion.div {...animProps}>
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-5"
                      aria-label="Create account form"
                    >
                      {/* Full Name */}
                      <FormField
                        control={form.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground/80">Full Name</FormLabel>
                            <FormControl>
                              <div className="relative forge-input-glow rounded-xl">
                                <Input
                                  placeholder="Enter your full name"
                                  className="h-12 pl-10 text-sm bg-[#1D1D1D]/50 border-border/20 rounded-xl placeholder:text-muted-foreground/40"
                                  autoComplete="name"
                                  aria-required="true"
                                  disabled={loading}
                                  {...field}
                                  ref={(node: HTMLInputElement) => {
                                    field.ref(node)
                                    nameRef.current = node
                                  }}
                                />
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" aria-hidden="true" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Email */}
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
                                />
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" aria-hidden="true" />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Password */}
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground/80">Password</FormLabel>
                            <FormControl>
                              <div className="relative forge-input-glow rounded-xl">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="Create a password"
                                  className="h-12 pl-10 pr-10 text-sm bg-[#1D1D1D]/50 border-border/20 rounded-xl placeholder:text-muted-foreground/40"
                                  autoComplete="new-password"
                                  aria-required="true"
                                  disabled={loading}
                                  {...field}
                                />
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" aria-hidden="true" />
                                <button
                                  type="button"
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                                  onClick={() => setShowPassword((v) => !v)}
                                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                                  tabIndex={0}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormDescription className="text-xs text-foreground/60">
                              At least 8 characters with uppercase, lowercase, and a number
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Confirm Password */}
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-foreground/80">Confirm Password</FormLabel>
                            <FormControl>
                              <div className="relative forge-input-glow rounded-xl">
                                <Input
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  placeholder="Confirm your password"
                                  className="h-12 pl-10 pr-10 text-sm bg-[#1D1D1D]/50 border-border/20 rounded-xl placeholder:text-muted-foreground/40"
                                  autoComplete="new-password"
                                  aria-required="true"
                                  disabled={loading}
                                  {...field}
                                />
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" aria-hidden="true" />
                                <button
                                  type="button"
                                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                                  onClick={() => setShowConfirmPassword((v) => !v)}
                                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                  tabIndex={0}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

                      {/* Submit — premium button */}
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
                            <span>Creating account...</span>
                          </>
                        ) : (
                          <>
                            <span>Create Account</span>
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
                </motion.div>

                {/* Back button */}
                <motion.div className="mt-4" variants={fadeUp}>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm text-foreground/60 hover:text-foreground/70"
                    onClick={() => setStep(1)}
                  >
                    ← Back
                  </Button>
                </motion.div>

                {/* Login link */}
                <motion.p className="mt-4 text-center text-sm text-foreground/60" variants={fadeUp}>
                  Already have an account?{' '}
                  <Link
                    href={ROUTES.LOGIN}
                    className="font-medium text-foreground hover:underline focus-visible:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                  >
                    Sign in
                  </Link>
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  )
}
