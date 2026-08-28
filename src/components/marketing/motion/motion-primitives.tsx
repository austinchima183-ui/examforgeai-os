'use client'

import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useInView, useScroll, useMotionTemplate } from 'framer-motion'
import { cn } from '@/lib/utils'

// Primary brand RGB for motion primitives (consistent with forgePatternColors.primaryRgb)
const PRIMARY_RGB = '79, 70, 229'

// ============================================================================
// ExamForge AI — Premium Motion Primitives
// ============================================================================
// World-class motion design system inspired by Stripe, Linear, Vercel.
// Every animation is subtle, physics-based, and GPU-accelerated.
// Supports reduced motion preferences automatically.
// ============================================================================

/* ─── Spring Configs (Physics-based, not linear) ─── */
export const springs = {
  /** Snappy — for buttons, toggles, micro-interactions */
  snappy: { stiffness: 400, damping: 30, mass: 0.8 } as const,
  /** Gentle — for cards, modals, overlays */
  gentle: { stiffness: 150, damping: 20, mass: 1 } as const,
  /** Bouncy — for success states, celebrations */
  bouncy: { stiffness: 300, damping: 15, mass: 0.8 } as const,
  /** Smooth — for page transitions, large reveals */
  smooth: { stiffness: 100, damping: 20, mass: 1.2 } as const,
  /** Wobbly — for playful hover effects */
  wobbly: { stiffness: 200, damping: 12, mass: 1 } as const,
}

/* ─── Duration Presets ─── */
export const durations = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.35,
  slow: 0.5,
  slower: 0.8,
  reveal: 0.6,
} as const

/* ─── Easing Curves ─── */
export const easings = {
  /** Custom cubic bezier matching Stripe's signature ease */
  premium: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number],
  /** Deceleration — elements entering */
  decelerate: [0, 0, 0.2, 1] as [number, number, number, number],
  /** Acceleration — elements leaving */
  accelerate: [0.4, 0, 1, 1] as [number, number, number, number],
  /** Elastic overshoot */
  elastic: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
}

/* ─── Stagger Delays ─── */
export function staggerDelay(index: number, baseDelay = 0.08) {
  return index * baseDelay
}

// ============================================================================
// Mouse Follow Gradient
// ============================================================================

interface MouseFollowGradientProps {
  children: ReactNode
  className?: string
  color?: string
  size?: number
  opacity?: number
}

export function MouseFollowGradient({
  children,
  className,
  color = `rgba(${PRIMARY_RGB}, 0.15)`,
  size = 300,
  opacity = 1,
}: MouseFollowGradientProps) {
  const ref = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springX = useSpring(mouseX, springs.gentle)
  const springY = useSpring(mouseY, springs.gentle)

  const background = useMotionTemplate`
    radial-gradient(${size}px circle at ${springX}px ${springY}px, ${color}, transparent 80%)
  `

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn('relative group', className)}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
        style={{ background, opacity }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

// ============================================================================
// Card Tilt — 3D perspective tilt on hover
// ============================================================================

interface CardTiltProps {
  children: ReactNode
  className?: string
  maxTilt?: number
  scale?: number
  glare?: boolean
}

export function CardTilt({
  children,
  className,
  maxTilt = 6,
  scale = 1.02,
  glare = true,
}: CardTiltProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-0.5, 0.5], [maxTilt, -maxTilt])
  const rotateY = useTransform(x, [-0.5, 0.5], [-maxTilt, maxTilt])

  const springRotateX = useSpring(rotateX, springs.gentle)
  const springRotateY = useSpring(rotateY, springs.gentle)

  // Glare position
  const glareX = useTransform(x, [-0.5, 0.5], [0, 100])
  const glareY = useTransform(y, [-0.5, 0.5], [0, 100])
  const glareBackground = useMotionTemplate`
    radial-gradient(300px circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.08), transparent 60%)
  `

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function handleMouseLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: springRotateX,
        rotateY: springRotateY,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{ scale }}
      transition={{ scale: { ...springs.snappy } }}
      className={cn('will-change-transform group', className)}
    >
      {children}
      {glare && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: glareBackground }}
          aria-hidden="true"
        />
      )}
    </motion.div>
  )
}

// ============================================================================
// Magnetic Button — Cursor attracts button on hover
// ============================================================================

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  strength?: number
  radius?: number
}

export function MagneticButton({
  children,
  className,
  strength = 0.3,
  radius = 150,
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, springs.snappy)
  const springY = useSpring(y, springs.snappy)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function handleMouseMove(e: MouseEvent) {
      if (!el) return
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const distX = e.clientX - centerX
      const distY = e.clientY - centerY
      const dist = Math.sqrt(distX * distX + distY * distY)

      if (dist < radius) {
        x.set(distX * strength)
        y.set(distY * strength)
      } else {
        x.set(0)
        y.set(0)
      }
    }

    function handleMouseLeave() {
      x.set(0)
      y.set(0)
    }

    window.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [x, y, strength, radius])

  return (
    <motion.div
      ref={ref}
      style={{ x: springX, y: springY }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Animated Gradient Border
// ============================================================================

interface AnimatedGradientBorderProps {
  children: ReactNode
  className?: string
  borderWidth?: number
  colors?: string[]
  duration?: number
  borderRadius?: string
}

export function AnimatedGradientBorder({
  children,
  className,
  borderWidth = 1.5,
  colors = ['#4F46E5', '#7C3AED', '#06B6D4', '#4F46E5'],
  duration = 4,
  borderRadius = '1rem',
}: AnimatedGradientBorderProps) {
  const gradient = colors.join(', ')

  return (
    <div className={cn('relative overflow-hidden', className)} style={{ borderRadius }}>
      <motion.div
        className="absolute inset-0"
        style={{ borderRadius }}
        animate={{ rotate: 360 }}
        transition={{ duration, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(from 0deg, ${gradient})`,
            borderRadius,
          }}
        />
      </motion.div>

      <div
        className="relative"
        style={{
          margin: borderWidth,
          borderRadius: `calc(${borderRadius} - ${borderWidth}px)`,
          background: 'var(--card)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// Scroll-Linked Progress Bar
// ============================================================================

interface ScrollProgressProps {
  className?: string
  color?: string
}

export function ScrollProgress({ className, color = 'var(--primary)' }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll()
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])

  return (
    <motion.div
      className={cn('fixed top-0 left-0 right-0 h-[2px] z-50 origin-left', className)}
      style={{ scaleX, background: color }}
      aria-hidden="true"
    />
  )
}

// ============================================================================
// Parallax Layer
// ============================================================================

interface ParallaxLayerProps {
  children: ReactNode
  className?: string
  speed?: number
  range?: number
}

export function ParallaxLayer({
  children,
  className,
  speed = 0.5,
  range = 100,
}: ParallaxLayerProps) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 3000], [0, -range * speed])

  return (
    <motion.div
      style={{ y }}
      className={cn('will-change-transform', className)}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Spotlight Hover
// ============================================================================

interface SpotlightHoverProps {
  children: ReactNode
  className?: string
}

export function SpotlightHover({ children, className }: SpotlightHoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn('relative overflow-hidden', className)}
    >
      {isHovered && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
          style={{
            background: `radial-gradient(300px circle at ${position.x}px ${position.y}px, rgba(${PRIMARY_RGB},0.08), transparent 60%)`,
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  )
}

// ============================================================================
// Reveal Mask
// ============================================================================

interface RevealMaskProps {
  children: ReactNode
  className?: string
  direction?: 'up' | 'down' | 'left' | 'right' | 'center'
  delay?: number
}

export function RevealMask({
  children,
  className,
  direction = 'up',
  delay = 0,
}: RevealMaskProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  const clipPaths = {
    up: 'inset(100% 0% 0% 0%)',
    down: 'inset(0% 0% 100% 0%)',
    left: 'inset(0% 100% 0% 0%)',
    right: 'inset(0% 0% 0% 100%)',
    center: 'inset(50% 50% 50% 50%)',
  }

  return (
    <motion.div
      ref={ref}
      initial={{ clipPath: clipPaths[direction] }}
      animate={isInView ? { clipPath: 'inset(0% 0% 0% 0%)' } : {}}
      transition={{ duration: durations.slow, delay, ease: easings.premium }}
      className={cn('will-change-[clip-path]', className)}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Stagger Container
// ============================================================================

interface StaggerContainerProps {
  children: ReactNode
  className?: string
  stagger?: number
  initialDelay?: number
}

export function StaggerContainer({
  children,
  className,
  stagger = 0.08,
  initialDelay = 0,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: initialDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: durations.normal, ease: easings.premium },
  },
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  )
}

// ============================================================================
// Floating Particles
// ============================================================================

interface FloatingParticlesProps {
  className?: string
  count?: number
  color?: string
  minSize?: number
  maxSize?: number
}

export function FloatingParticles({
  className,
  count = 25,
  color = `rgba(${PRIMARY_RGB}, 0.3)`,
  minSize = 2,
  maxSize = 5,
}: FloatingParticlesProps) {
  // Deterministic seeded PRNG — Math.random() during render causes hydration
  // mismatches (server and client generate different values). The seeded
  // sequence is identical on both, keeping SSR markup stable while still
  // looking naturally random.
  const particles = useRef(
    (() => {
      let seed = 0x9e3779b9
      const rand = () => {
        seed |= 0
        seed = (seed + 0x6d2b79f5) | 0
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
      return Array.from({ length: count }, () => ({
        x: rand() * 100,
        y: rand() * 100,
        size: minSize + rand() * (maxSize - minSize),
        duration: 12 + rand() * 18,
        delay: rand() * 5,
        drift: -20 + rand() * 40,
      }))
    })()
  ).current

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)} aria-hidden="true">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: color,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, p.drift, 0],
            opacity: [0, 0.5, 0],
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

// ============================================================================
// Animated Mesh Background
// ============================================================================

interface MeshBackgroundProps {
  className?: string
  lineColor?: string
  spacing?: number
}

export function MeshBackground({
  className,
  lineColor = `rgba(${PRIMARY_RGB}, 0.05)`,
  spacing = 60,
}: MeshBackgroundProps) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)} aria-hidden="true">
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(${lineColor} 1px, transparent 1px),
            linear-gradient(90deg, ${lineColor} 1px, transparent 1px)
          `,
          backgroundSize: `${spacing}px ${spacing}px`,
        }}
        animate={{
          backgroundPositionX: [0, spacing],
          backgroundPositionY: [0, spacing],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  )
}

// ============================================================================
// Glass Reflection
// ============================================================================

interface GlassReflectionProps {
  children: ReactNode
  className?: string
}

export function GlassReflection({ children, className }: GlassReflectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 50, y: 50 })

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-card/70 backdrop-blur-xl',
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
        style={{
          background: `radial-gradient(400px circle at ${position.x}% ${position.y}%, rgba(255,255,255,0.06), transparent 60%)`,
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  )
}

// ============================================================================
// Depth Shadow
// ============================================================================

interface DepthShadowProps {
  children: ReactNode
  className?: string
  intensity?: number
}

export function DepthShadow({ children, className, intensity = 25 }: DepthShadowProps) {
  return (
    <motion.div
      className={cn('group', className)}
      whileHover={{
        y: -3,
        boxShadow: `0 ${intensity}px ${intensity * 2}px rgba(${PRIMARY_RGB}, 0.06), 0 ${intensity / 2}px ${intensity}px rgba(0, 0, 0, 0.03)`,
      }}
      transition={{ ...springs.gentle, duration: durations.normal }}
    >
      {children}
    </motion.div>
  )
}

// ============================================================================
// Text Reveal — Character-by-character animation
// ============================================================================

interface TextRevealProps {
  text: string
  className?: string
  delay?: number
  stagger?: number
  as?: 'span' | 'h1' | 'h2' | 'h3' | 'p'
}

export function TextReveal({
  text,
  className,
  delay = 0,
  stagger = 0.025,
  as: Component = 'span',
}: TextRevealProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  return (
    <Component ref={ref as any} className={cn('inline-flex flex-wrap', className)}>
      {text.split('').map((char, i) => (
        <motion.span
          key={`${char}-${i}`}
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{
            duration: durations.normal,
            delay: delay + i * stagger,
            ease: easings.premium,
          }}
          className="inline-block"
          style={{ whiteSpace: char === ' ' ? 'pre' : undefined }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </Component>
  )
}

// ============================================================================
// Count Up — Spring-based animated number
// ============================================================================

interface CountUpProps {
  target: number
  suffix?: string
  prefix?: string
  duration?: number
  className?: string
  decimals?: number
}

export function CountUp({
  target,
  suffix = '',
  prefix = '',
  duration = 2,
  className,
  decimals = 0,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const motionVal = useMotionValue(0)
  const springVal = useSpring(motionVal, { stiffness: 100, damping: 30, duration: duration * 1000 })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (isInView) {
      motionVal.set(target)
    }
  }, [isInView, motionVal, target])

  useEffect(() => {
    const unsub = springVal.on('change', (v) => {
      setDisplay(decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString())
    })
    return unsub
  }, [springVal, decimals])

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  )
}

// ============================================================================
// Shimmer Loading
// ============================================================================

interface ShimmerProps {
  className?: string
  width?: string
  height?: string
  rounded?: string
}

export function Shimmer({ className, width = '100%', height = '20px', rounded = '8px' }: ShimmerProps) {
  return (
    <div
      className={cn('relative overflow-hidden bg-muted/50', className)}
      style={{ width, height, borderRadius: rounded }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

// ============================================================================
// Ripple Button
// ============================================================================

interface RippleButtonProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  rippleColor?: string
}

export function RippleButton({
  children,
  className,
  onClick,
  rippleColor = 'rgba(255, 255, 255, 0.3)',
}: RippleButtonProps) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples((prev) => [...prev, { x, y, id }])
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
    onClick?.()
  }, [onClick])

  return (
    <button
      onClick={handleClick}
      className={cn('relative overflow-hidden', className)}
    >
      {children}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            background: rippleColor,
            translateX: '-50%',
            translateY: '-50%',
          }}
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </button>
  )
}

// ============================================================================
// Animated Section Divider
// ============================================================================

interface SectionDividerProps {
  className?: string
  variant?: 'gradient' | 'dots' | 'line' | 'wave'
}

export function SectionDivider({ className, variant = 'gradient' }: SectionDividerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  if (variant === 'dots') {
    return (
      <div ref={ref} className={cn('flex items-center justify-center gap-2 py-4', className)}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/30"
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ delay: i * 0.1, ...springs.bouncy }}
          />
        ))}
      </div>
    )
  }

  if (variant === 'wave') {
    return (
      <div ref={ref} className={cn('relative h-8 overflow-hidden', className)} aria-hidden="true">
        <motion.svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1200 32"
          preserveAspectRatio="none"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: durations.normal }}
        >
          <motion.path
            d="M0 16 Q300 0 600 16 Q900 32 1200 16"
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : {}}
            transition={{ duration: durations.slower, ease: easings.premium }}
          />
        </motion.svg>
      </div>
    )
  }

  return (
    <motion.div
      ref={ref}
      className={cn('h-px max-w-md mx-auto', className)}
      style={{
        background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
      }}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
      transition={{ duration: durations.slow, ease: easings.premium }}
    />
  )
}

// ============================================================================
// Scroll-Linked Fade — Elements fade based on scroll position
// ============================================================================

interface ScrollLinkedFadeProps {
  children: ReactNode
  className?: string
  /** Offset from top of viewport to start fading (0-1) */
  fadeStart?: number
  /** Offset where element is fully invisible (0-1) */
  fadeEnd?: number
}

export function ScrollLinkedFade({
  children,
  className,
  fadeStart = 0,
  fadeEnd = 0.1,
}: ScrollLinkedFadeProps) {
  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [fadeStart, fadeEnd], [1, 0])

  return (
    <motion.div style={{ opacity }} className={className}>
      {children}
    </motion.div>
  )
}

// ============================================================================
// Animated Checkmark — Success state animation
// ============================================================================

interface AnimatedCheckmarkProps {
  className?: string
  size?: number
  color?: string
}

export function AnimatedCheckmark({ className, size = 24, color = 'var(--primary)' }: AnimatedCheckmarkProps) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <motion.path
        d="M5 12l5 5L20 7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: durations.normal, ease: easings.premium, delay: 0.1 }}
      />
    </motion.svg>
  )
}

// ============================================================================
// Hover Gradient — Background gradient that shifts on hover
// ============================================================================

interface HoverGradientProps {
  children: ReactNode
  className?: string
  from?: string
  via?: string
  to?: string
}

export function HoverGradient({
  children,
  className,
  from = `rgba(${PRIMARY_RGB},0.06)`,
  via = 'rgba(245,158,11,0.04)',   // Ember accent
  to = 'rgba(34,211,238,0.06)',    // Neural accent
}: HoverGradientProps) {
  return (
    <motion.div
      className={cn('group relative overflow-hidden', className)}
      whileHover={{
        background: `linear-gradient(135deg, ${from}, ${via}, ${to})`,
      }}
      transition={{ duration: durations.normal }}
    >
      {children}
    </motion.div>
  )
}
