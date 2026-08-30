'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Sparkles, Users, GraduationCap, BarChart3, MonitorPlay, Bot, Store, ChevronRight, GraduationCap as StudentIcon, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { METRICS } from '@/lib/brand-constants'
import { useAnalytics } from '@/hooks/use-analytics'
import { GradientText } from '@/components/marketing/gradient-text'
import { AnimatedCounter } from '@/components/marketing/animated-counter'
import { forgePatternColors, featureGradientPresets } from '@/components/marketing/design-system'
import {
  AdminDashboardScreen,
  CBTExamInterfaceScreen,
  AIQuestionGeneratorScreen,
  AnalyticsDashboardScreen,
  StudentPortalScreen,
  TeacherPortalScreen,
  ParentPortalScreen,
  MarketplacePreviewScreen,
} from '@/components/marketing/illustrations'
import {
  FloatingParticles,
  MagneticButton,
  MeshBackground,
  MouseFollowGradient,
  ConditionalMotion,
  springs,
  durations,
  easings,
} from '@/components/marketing/motion'

// ============================================================================
// ExamForge AI — Hero Section (World-Class AI OS Experience)
// ============================================================================
// Full-viewport hero with interactive dashboard preview that tabs between
// 8 product modules. MASSIVE typography, animated gradient border, neural-glow
// badge, mouse-follow spotlight, parallax tilt, forge-mesh-bg grid overlay,
// Linear-style tabs, premium CTA states, compact metrics.
// Inspiration: Cursor.dev × v0.dev × Linear.app × ChatGPT
// ============================================================================

const stats = [
  { label: 'Schools', value: METRICS.schools, suffix: '+', icon: GraduationCap },
  { label: 'Students', value: METRICS.students / 1000, suffix: 'K+', icon: Users },
  { label: 'Exams Taken', value: METRICS.examsDelivered / 1000000, suffix: 'M+', icon: BarChart3 },
  { label: 'AI Accuracy', value: METRICS.aiAccuracy, suffix: '%', icon: Sparkles },
]

const dashboardTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'cbt', label: 'Live CBT', icon: MonitorPlay },
  { id: 'ai', label: 'AI Generate', icon: Bot },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'student', label: 'Student Portal', icon: GraduationCap },
  { id: 'teacher', label: 'Teacher Portal', icon: BookOpen },
  { id: 'parent', label: 'Parent Portal', icon: Users },
  { id: 'marketplace', label: 'Marketplace', icon: Store },
]

// Floating cards use branded colors: Neural (AI), Ember (CBT/Exams), Primary (Auto Marking)
const floatingCards = [
  {
    label: 'AI Question Generation',
    value: '40/40 complete',
    description: 'SS2 Biology · 28s · 99.1% accuracy',
    color: 'bg-cyan-500',          // Neural — AI feature
    glowColor: 'shadow-cyan-500/20',
    x: 'left-[5%] top-[18%]',
    delay: 0,
  },
  {
    label: 'Live CBT Monitoring',
    value: '712 students online',
    description: 'SS2 Bio · 3 halls · 2 flagged',
    color: 'bg-yellow-50 dark:bg-yellow-9500',          // Ember — exam feature
    glowColor: 'shadow-amber-500/20',
    x: 'right-[3%] top-[12%]',
    delay: 0.2,
  },
  {
    label: 'Auto Marking',
    value: '1,247 / 1,263 graded',
    description: '98.7% complete · AI accuracy 99.1%',
    color: 'bg-primary',         // Primary — core feature
    glowColor: 'shadow-primary/20',
    x: 'right-[6%] bottom-[22%]',
    delay: 0.4,
  },
]

// ---------------------------------------------------------------------------
// Typing Effect Hook
// ---------------------------------------------------------------------------
function useTypingEffect(text: string, speed = 60, startDelay = 800) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    let timeout: ReturnType<typeof setTimeout>
    const start = () => {
      timeout = setTimeout(() => {
        if (i < text.length) {
          setDisplayed(text.slice(0, i + 1))
          i++
          start()
        } else {
          setDone(true)
        }
      }, speed)
    }
    const initialDelay = setTimeout(start, startDelay)
    return () => {
      clearTimeout(initialDelay)
      clearTimeout(timeout)
    }
  }, [text, speed, startDelay])

  return { displayed, done }
}

// ---------------------------------------------------------------------------
// Parallax Tilt Hook (requestAnimationFrame-based, throttled)
// ---------------------------------------------------------------------------
function useParallaxTilt(intensity = 8) {
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2
      targetRef.current = { x: x * intensity, y: -y * intensity }
    },
    [intensity]
  )

  const handleMouseLeave = useCallback(() => {
    targetRef.current = { x: 0, y: 0 }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return

    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)

    const animate = () => {
      // Lerp towards target for smooth easing
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.08
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.08

      if (el) {
        el.style.transform = `perspective(1200px) rotateX(${currentRef.current.y}deg) rotateY(${currentRef.current.x}deg)`
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [handleMouseMove, handleMouseLeave])

  return ref
}

// ---------------------------------------------------------------------------
// Animated Gradient Border Component
// ---------------------------------------------------------------------------
function AnimatedGradientBorder({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-xl sm:rounded-2xl p-[1.5px] ${className ?? ''}`}>
      {/* Animated gradient border — premium conic rotation */}
      <div
        className="absolute inset-0 rounded-xl sm:rounded-2xl overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute inset-[-50%] animate-gradient-spin"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0%, oklch(0.488 0.217 275) 8%, transparent 16%, oklch(0.680 0.170 70) 24%, transparent 32%, oklch(0.600 0.170 195) 40%, transparent 50%, oklch(0.488 0.217 275) 58%, transparent 66%, oklch(0.680 0.170 70) 74%, transparent 82%, oklch(0.600 0.170 195) 90%, transparent 100%)',
          }}
        />
        {/* Inner mask — subtle backdrop blur for glass depth */}
        <div className="absolute inset-[1.5px] rounded-[calc(0.75rem-1.5px)] sm:rounded-[calc(1rem-1.5px)] bg-[#090909]/90 backdrop-blur-md" />
      </div>
      {/* Subtle outer glow ring */}
      <div className="absolute -inset-[1px] rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary/5 via-cyan-400/5 to-amber-400/5 blur-sm -z-10" aria-hidden="true" />
      <div className="relative">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shimmer Badge Component
// ---------------------------------------------------------------------------
function ShimmerBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Link
        href="/changelog"
        className="group relative inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/6 px-5 py-2 text-[13px] font-medium text-cyan-400 mb-8 hover:bg-cyan-400/12 hover:border-cyan-400/35 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] neural-glow"
        aria-label="View changelog: Now with AI-Powered Exam Generation v2"
      >
        {/* Shimmer overlay — neural pulse */}
        <span className="absolute inset-0 rounded-full overflow-hidden" aria-hidden="true">
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent translate-x-[-100%] animate-[shimmer_2.5s_ease-in-out_infinite] group-hover:via-cyan-300/40" />
        </span>
        <Sparkles className="h-3.5 w-3.5 relative" aria-hidden="true" />
        <span className="relative">Now with AI-Powered Exam Generation v2</span>
        <ChevronRight className="h-3 w-3 relative transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Dashboard Preview Component — Real Product Screens
// ---------------------------------------------------------------------------
function DashboardPreview() {
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => {
        const idx = dashboardTabs.findIndex((t) => t.id === prev)
        return dashboardTabs[(idx + 1) % dashboardTabs.length].id
      })
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  const screenMap: Record<string, React.FC> = {
    dashboard: AdminDashboardScreen,
    cbt: CBTExamInterfaceScreen,
    ai: AIQuestionGeneratorScreen,
    analytics: AnalyticsDashboardScreen,
    student: StudentPortalScreen,
    teacher: TeacherPortalScreen,
    parent: ParentPortalScreen,
    marketplace: MarketplacePreviewScreen,
  }

  return (
    <div className="relative rounded-xl sm:rounded-2xl border border-white/[0.06] bg-[#0c0c0c]/80 backdrop-blur-2xl shadow-[0_2px_20px_rgba(0,0,0,0.3)] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.04] bg-[#090909]/40 backdrop-blur-md">
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="h-3 w-3 rounded-full bg-red-400/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
          <div className="h-3 w-3 rounded-full bg-green-400/80" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="h-7 w-80 rounded-md bg-muted/50 backdrop-blur-sm flex items-center justify-center gap-2 border border-white/5">
            <div className="h-3.5 w-3.5 rounded bg-primary/80 flex items-center justify-center">
              <BookOpen className="h-2 w-2 text-primary-foreground" />
            </div>
            <span className="text-[11px] text-muted-foreground font-medium">app.examforge.ai/dashboard</span>
            <span className="flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-9500/10 px-1.5 py-0.5 text-[8px] font-medium text-green-600 dark:text-green-400">
              <span className="h-1 w-1 rounded-full bg-green-50 dark:bg-green-9500 animate-pulse" />
              LIVE
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-muted/40 flex items-center justify-center">
            <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </div>
        </div>
      </div>

      {/* Tab bar — Linear-inspired minimal style with spring indicator */}
      <div
        className="relative flex items-center gap-0.5 px-2 py-1.5 border-b border-white/5 bg-[#090909]/60 overflow-x-auto scrollbar-thin"
        role="tablist"
        aria-label="Dashboard modules"
      >
        {dashboardTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80'
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {tab.label}
              {/* Active indicator — spring animated underline */}
              {isActive && (
                <motion.div
                  layoutId="hero-tab-indicator"
                  className="absolute inset-x-1 -bottom-[1.5px] h-[1.5px] rounded-full bg-gradient-to-r from-primary via-cyan-400 to-primary"
                  transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.8 }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Product screen content */}
      <div className="p-2 sm:p-3 bg-[#090909]/40">
        <AnimatePresence mode="wait">
          {(() => {
            const ScreenComponent = screenMap[activeTab]
            return ScreenComponent ? (
              <motion.div
                key={activeTab}
                id={`panel-${activeTab}`}
                role="tabpanel"
                aria-labelledby={`tab-${activeTab}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <ScreenComponent />
              </motion.div>
            ) : null
          })()}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Hero Section
// ---------------------------------------------------------------------------
export function HeroSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const tiltRef = useParallaxTilt(6)
  const { displayed: typedText, done: typingDone } = useTypingEffect('Modern Schools', 65, 900)
  const { trackEvent } = useAnalytics()

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
      style={{ background: '#090909' }}
      aria-labelledby="hero-heading"
    >
      {/* ----------------------------------------------------------------- */}
      {/* Background effects — Premium layered composition                  */}
      {/* ----------------------------------------------------------------- */}
      {/* Ambient radial gradients on #090909 base */}
      <div className="absolute inset-0 -z-10" aria-hidden="true" style={{ background: '#090909' }}>
        {/* Primary ambient glow — top center */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(59,130,246,0.10) 0%, transparent 55%)' }} />
        {/* Neural cyan — right bottom */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 40% at 75% 85%, rgba(34,211,238,0.06) 0%, transparent 50%)' }} />
        {/* Violet — left mid */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 45% 35% at 15% 50%, rgba(139,92,246,0.05) 0%, transparent 50%)' }} />
        {/* Ember warmth — bottom left */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 40% 30% at 25% 90%, rgba(245,158,11,0.04) 0%, transparent 50%)' }} />
      </div>
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {/* Animated gradient orbs — breathing, alive */}
        <motion.div
          className="absolute top-[-10%] left-[10%] h-[900px] w-[900px] rounded-full bg-primary/10 blur-[180px]"
          animate={{
            scale: [1, 1.12, 1],
            x: [0, 30, 0],
            y: [0, -25, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-[-5%] right-[10%] h-[800px] w-[800px] rounded-full bg-amber-400/7 blur-[160px]"
          animate={{
            scale: [1, 1.14, 1],
            x: [0, -35, 0],
            y: [0, 25, 0],
          }}
          transition={{
            duration: 17,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
        />
        <motion.div
          className="absolute top-[20%] right-[20%] h-[700px] w-[700px] rounded-full bg-cyan-400/8 blur-[150px]"
          animate={{
            scale: [1, 1.1, 1],
            y: [0, -40, 0],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 4,
          }}
        />
        {/* Extra accent orb — ember warmth */}
        <motion.div
          className="absolute bottom-[15%] left-[25%] h-[500px] w-[500px] rounded-full bg-amber-400/5 blur-[130px]"
          animate={{
            scale: [1, 1.16, 1],
            x: [0, 25, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1,
          }}
        />
        {/* Animated mesh grid — Vercel-style subtle movement */}
        <ConditionalMotion>
          <MeshBackground
            lineColor={`rgba(${forgePatternColors.primaryRgb}, 0.03)`}
            spacing={60}
            className="opacity-20 dark:opacity-35"
          />
        </ConditionalMotion>
        {/* Floating particles — ambient, very subtle */}
        <ConditionalMotion>
          <FloatingParticles
            count={18}
            color={`rgba(${forgePatternColors.primaryRgb}, 0.15)`}
            minSize={1.5}
            maxSize={3.5}
            className="opacity-40"
          />
        </ConditionalMotion>
        {/* Radial vignette — deep edges */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 35%, #090909 100%)',
          }}
        />
      </div>
      {/* Mouse-following radial gradient light — Linear-style subtle spotlight */}
      <MouseFollowGradient
        color="rgba(59, 130, 246, 0.07)"
        size={500}
        className="absolute inset-0 -z-[5] pointer-events-none"
      >
        <></>
      </MouseFollowGradient>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
        <div className="text-center max-w-4xl mx-auto">
          {/* ------------------------------------------------------------- */}
          {/* Badge — with shimmer animation                                */}
          {/* ------------------------------------------------------------- */}
          <ShimmerBadge />

          {/* ------------------------------------------------------------- */}
          {/* Headline — with typing effect on "Modern Schools"             */}
          {/* ------------------------------------------------------------- */}
          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-[3.5rem] sm:text-7xl md:text-8xl lg:text-[5.5rem] xl:text-[6.5rem] font-bold tracking-[-0.04em] leading-[1.0]"
          >
            The{' '}
            <span className="forge-gradient-text">AI Operating System</span>{' '}
            <br className="hidden sm:block" />
            for{' '}
            <span className="relative inline-block">
              <GradientText preset="neural" className="text-[3.5rem] sm:text-7xl md:text-8xl lg:text-[5.5rem] xl:text-[6.5rem] font-bold">
                {typedText}
              </GradientText>
              {/* Typing cursor */}
              {!typingDone && (
                <motion.span
                  className="absolute -right-[2px] top-0 bottom-0 w-[3px] bg-primary/80 rounded-full"
                  aria-hidden="true"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
                />
              )}
              {/* Glow underline after typing completes */}
              {typingDone && (
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-primary to-cyan-400"
                  aria-hidden="true"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{ transformOrigin: 'left' }}
                />
              )}
            </span>
          </motion.h1>

          {/* ------------------------------------------------------------- */}
          {/* Description                                                    */}
          {/* ------------------------------------------------------------- */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="mt-6 text-lg sm:text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed"
          >
            One platform to manage schools, run CBT exams, automate administration,
            analyze performance, and empower learning with AI.{' '}
            <span className="forge-gradient-text font-medium">Built for the future of education.</span>
          </motion.p>

          {/* ------------------------------------------------------------- */}
          {/* CTAs                                                           */}
          {/* ------------------------------------------------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <MagneticButton strength={0.15} radius={200}>
              <Button
                size="lg"
                className="group/btn h-13 px-9 text-base font-semibold shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] forge-glow"
                asChild
              >
                <Link href="/register" aria-label="Start your free trial" onClick={() => { try { trackEvent('cta_click', { cta: 'start_free_trial', location: 'hero' }) } catch {} }}>
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" aria-hidden="true" />
                </Link>
              </Button>
            </MagneticButton>
            <Link href="/contact" className="group/link inline-flex items-center gap-1.5 text-sm font-medium text-foreground/50 hover:text-foreground/80 transition-colors duration-200 mt-2 sm:mt-0" aria-label="Book a demo" onClick={() => { try { trackEvent('cta_click', { cta: 'book_demo', location: 'hero' }) } catch {} }}>
              Book a Demo
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-0.5" />
            </Link>
          </motion.div>

          {/* ------------------------------------------------------------- */}
          {/* Stats                                                          */}
          {/* ------------------------------------------------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="flex items-center gap-1.5 animate-fade-in" style={{ animationDelay: `${0.7 + i * 0.1}s` }}>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
                  <span className="text-sm font-bold tracking-tight text-foreground">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </span>
                  <span className="text-xs text-muted-foreground/60">{stat.label}</span>
                </div>
              )
            })}
          </motion.div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Dashboard Preview — with parallax tilt & animated gradient border */}
        {/* ----------------------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.8, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
          className="mt-14 sm:mt-16 relative"
        >
          <div className="relative mx-auto max-w-5xl">
            {/* Glow behind the dashboard — softer, more ambient */}
            <div className="absolute inset-0 -z-10 scale-[0.97]" aria-hidden="true">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/20 via-cyan-400/10 to-amber-400/3 blur-3xl" />
            </div>
            {/* Forge mesh grid overlay behind dashboard */}
            <div className="absolute inset-0 -z-[8] rounded-2xl overflow-hidden forge-mesh-bg opacity-60" aria-hidden="true" />

            {/* Parallax tilt wrapper */}
            <div
              ref={tiltRef}
              className="transition-transform duration-100 ease-out will-change-transform"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Animated gradient border with mouse-follow spotlight */}
              <MouseFollowGradient
                color="rgba(59, 130, 246, 0.08)"
                size={450}
                className="rounded-xl sm:rounded-2xl"
              >
                <AnimatedGradientBorder>
                  <DashboardPreview />
                </AnimatedGradientBorder>
              </MouseFollowGradient>
            </div>

            {/* ----------------------------------------------------------------- */}
            {/* Floating cards — enhanced glassmorphism & glow                   */}
            {/* ----------------------------------------------------------------- */}
            {/* Decorative ambient motion — hidden from assistive tech (WCAG 2.2.2) */}
            {floatingCards.map((card, i) => (
              <motion.div
                key={card.label}
                aria-hidden="true"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 1.2 + card.delay }}
                className={`absolute hidden lg:block ${card.x} z-10`}
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                  className={`rounded-xl border border-white/[0.04] dark:border-white/[0.03] forge-glass-surface shadow-[0_2px_8px_rgba(0,0,0,0.15)] px-4 py-3`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${card.color} animate-pulse-glow`} />
                    <span className="text-xs font-medium">{card.label}</span>
                  </div>
                  <p className="text-sm font-bold mt-0.5">{card.value}</p>
                  <p className="text-[10px] text-foreground/70 mt-0.5">{card.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Global keyframes injected via style tag                              */}
      {/* ------------------------------------------------------------------- */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes gradient-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-gradient-spin {
          animation: gradient-spin 4s linear infinite;
        }
        .animate-shimmer {
          animation: shimmer 2.5s ease-in-out infinite;
        }
      `}</style>
    </section>
  )
}
