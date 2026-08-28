'use client'

import { type ReactNode, type ComponentPropsWithoutRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  forgeGradients,
  forgeGlass,
  forgeShadows,
  forgeTypography,
  forgePatternColors,
  featureGradientPresets,
} from './design-tokens'

// ============================================================================
// ExamForge AI — Signature Components
// ============================================================================
// These are the EXCLUSIVE building blocks of the ExamForge visual identity.
// Every component here creates a visual fingerprint that says "this is ExamForge."
//
// Design Principles:
// 1. Every card has DEPTH — not flat, not generic glass, but layered glass
// 2. Every gradient tells a STORY — not random rainbow, but thematic meaning
// 3. Every animation FEELS like ExamForge — physics-based, never linear
// 4. Every pattern is BRANDED — mesh grids use primary, not gray
// ============================================================================

// ─── ForgeCard ───
// The signature card component. Replaces all generic glassmorphism cards.
// Every card in ExamForge has: glass background, themed gradient border glow
// on hover, depth shadow that increases on hover, and optional gradient icon.

export type ForgeCardGradient = keyof typeof featureGradientPresets | 'custom'

interface ForgeCardProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode
  /** Themed gradient preset — determines hover glow color and icon background */
  gradient?: ForgeCardGradient
  /** Custom gradient class (when gradient='custom') */
  customGradient?: string
  /** Glass depth level */
  glass?: 'surface' | 'elevated' | 'floating'
  /** Enable hover depth effect (shadow increases, slight lift) */
  hoverDepth?: boolean
  /** Enable gradient border glow on hover */
  borderGlow?: boolean
  /** Enable spotlight hover effect (radial gradient follows cursor area) */
  spotlight?: boolean
  /** Padding preset */
  padding?: 'sm' | 'md' | 'lg'
  /** Motion animation on scroll */
  animate?: boolean
  /** Delay for staggered animations */
  delay?: number
}

const paddingMap = { sm: 'p-4', md: 'p-6', lg: 'p-8 sm:p-10' }

export function ForgeCard({
  children,
  gradient = 'administration',
  customGradient,
  glass = 'surface',
  hoverDepth = true,
  borderGlow = true,
  spotlight = false,
  padding = 'md',
  animate = true,
  delay = 0,
  className,
  ...props
}: ForgeCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const glassPreset = forgeGlass[glass]
  const gradientClass = gradient === 'custom' ? customGradient : featureGradientPresets[gradient as keyof typeof featureGradientPresets]

  const content = (
    <div className="group relative" ref={ref}>
      {/* Gradient border glow on hover */}
      {borderGlow && gradientClass && (
        <div
          className={cn(
            'absolute -inset-px rounded-2xl bg-gradient-to-br',
            gradientClass,
            'opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-[1px]'
          )}
          aria-hidden="true"
        />
      )}

      <div
        className={cn(
          'relative rounded-2xl border transition-all duration-500',
          glassPreset.bg,
          glassPreset.border,
          paddingMap[padding],
          hoverDepth && 'hover:-translate-y-0.5',
          hoverDepth && forgeShadows.card,
          hoverDepth && `hover:${forgeShadows.cardHover}`,
          !hoverDepth && forgeShadows.card,
          'border-border/50 hover:border-primary/25',
          className
        )}
        {...props}
      >
        {/* Spotlight hover effect */}
        {spotlight && (
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: forgeGradients.radialForge }}
            aria-hidden="true"
          />
        )}
        {children}
      </div>
    </div>
  )

  if (!animate) return content

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {content}
    </motion.div>
  )
}

// ─── ForgeIconBox ───
// The signature icon container. Every feature card in ExamForge has a
// gradient-background icon box with a themed gradient.

interface ForgeIconBoxProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode
  gradient?: ForgeCardGradient
  customGradient?: string
  size?: 'sm' | 'md' | 'lg'
  hoverScale?: boolean
}

const iconBoxSizeMap = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }
const iconSizeMap = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' }

export function ForgeIconBox({
  children,
  gradient = 'administration',
  customGradient,
  size = 'md',
  hoverScale = true,
  className,
  ...props
}: ForgeIconBoxProps) {
  const gradientClass = gradient === 'custom' ? customGradient : featureGradientPresets[gradient as keyof typeof featureGradientPresets]

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-xl bg-gradient-to-br',
        gradientClass,
        'shadow-sm',
        iconBoxSizeMap[size],
        hoverScale && 'group-hover:scale-110 transition-transform duration-300',
        className
      )}
      {...props}
    >
      <div className={cn('text-white', iconSizeMap[size])}>
        {children}
      </div>
    </div>
  )
}

// ─── SectionHeader ───
// The signature section header. Replaces every repetitive
// "label → heading → description" pattern across all sections.

interface SectionHeaderProps {
  label: string
  heading: ReactNode
  description?: string
  /** Center (default) or left-align */
  align?: 'center' | 'left'
  /** Gradient preset for the heading accent text */
  gradientPreset?: 'forge' | 'neural' | 'ember' | 'cool' | 'rainbow'
  /** Max width of the text block */
  maxWidth?: string
  className?: string
}

export function SectionHeader({
  label,
  heading,
  description,
  align = 'center',
  gradientPreset = 'forge',
  maxWidth = 'max-w-3xl',
  className,
}: SectionHeaderProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const alignment = align === 'center' ? 'text-center mx-auto' : ''

  return (
    <div ref={ref} className={cn(alignment, maxWidth, 'mb-12 sm:mb-16', className)}>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4 }}
        className={cn(forgeTypography.sectionLabel, 'text-primary mb-4')}
      >
        {label}
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={forgeTypography.sectionHeading}
      >
        {heading}
      </motion.h2>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn(forgeTypography.sectionDescription, 'mt-4')}
        >
          {description}
        </motion.p>
      )}
    </div>
  )
}

// ─── ForgeBadge ───
// The signature badge/pill component. Every badge in ExamForge has
// a themed gradient border, glass background, and branded styling.

interface ForgeBadgeProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode
  variant?: 'primary' | 'ember' | 'neural' | 'success' | 'outline'
  size?: 'sm' | 'md'
  icon?: ReactNode
  /** Animate on scroll into view */
  animate?: boolean
}

const badgeVariantStyles = {
  primary: 'border-primary/20 bg-primary/5 text-primary',
  ember: 'border-amber-400/20 bg-amber-400/5 text-yellow-600 dark:text-yellow-400',
  neural: 'border-cyan-400/20 bg-cyan-400/5 text-cyan-600 dark:text-cyan-400',
  success: 'border-emerald-400/20 bg-emerald-400/5 text-green-600 dark:text-green-400',
  outline: 'border-border/30 bg-muted/30 text-muted-foreground',
}

const badgeSizes = {
  sm: 'px-2.5 py-0.5 text-xs gap-1',
  md: 'px-4 py-1.5 text-sm gap-2',
}

export function ForgeBadge({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  animate = true,
  className,
  ...props
}: ForgeBadgeProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })

  const content = (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        badgeVariantStyles[variant],
        badgeSizes[size],
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </div>
  )

  if (!animate) return content

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
    >
      {content}
    </motion.div>
  )
}

// ─── ForgeGradientBorder ───
// The signature animated gradient border container.
// Used for CTA cards, highlighted pricing tiers, hero dashboard preview.

interface ForgeGradientBorderProps extends ComponentPropsWithoutRef<'div'> {
  children: ReactNode
  /** The gradient to animate */
  gradient?: 'forge' | 'neural' | 'ember'
  /** Rotation speed in seconds (0 = no animation) */
  rotateSpeed?: number
  /** Border thickness */
  thickness?: number
  /** Enable outer glow */
  glow?: boolean
}

const gradientBorderColors = {
  forge: 'from-indigo-500 via-amber-400 to-cyan-400',
  neural: 'from-indigo-500 via-cyan-400 to-indigo-500',
  ember: 'from-indigo-500 via-amber-400 to-indigo-500',
}

const gradientGlowColors = {
  forge: 'from-indigo-500/10 via-amber-400/10 to-cyan-400/10',
  neural: 'from-indigo-500/10 via-cyan-400/10 to-indigo-500/10',
  ember: 'from-indigo-500/10 via-amber-400/10 to-indigo-500/10',
}

export function ForgeGradientBorder({
  children,
  gradient = 'forge',
  rotateSpeed = 8,
  thickness = 1.5,
  glow = true,
  className,
  ...props
}: ForgeGradientBorderProps) {
  const gradientClass = gradientBorderColors[gradient]
  const glowClass = gradientGlowColors[gradient]

  return (
    <div className={cn('relative rounded-2xl', className)} style={{ padding: `${thickness}px` }} {...props}>
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden" aria-hidden="true">
        {rotateSpeed > 0 ? (
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: rotateSpeed, repeat: Infinity, ease: 'linear' }}
            className={cn('absolute inset-0 bg-gradient-to-r', gradientClass)}
            style={{ transformOrigin: 'center' }}
          />
        ) : (
          <div className={cn('absolute inset-0 bg-gradient-to-r', gradientClass)} />
        )}
        <div className="absolute inset-px rounded-2xl bg-card" />
      </div>

      {/* Outer glow */}
      {glow && (
        <div
          className={cn('absolute -inset-3 rounded-2xl bg-gradient-to-r blur-xl opacity-60', glowClass)}
          aria-hidden="true"
        />
      )}

      {/* Content */}
      <div className="relative rounded-2xl">
        {children}
      </div>
    </div>
  )
}

// ─── ForgeStatCard ───
// The signature stat/metric display card. Every number in ExamForge
// uses this component — animated counter, themed accent, depth shadow.

interface ForgeStatCardProps extends ComponentPropsWithoutRef<'div'> {
  value: number
  suffix?: string
  prefix?: string
  label: string
  change?: string
  changeUp?: boolean
  animate?: boolean
  delay?: number
}

export function ForgeStatCard({
  value,
  suffix = '',
  prefix = '',
  label,
  change,
  changeUp = true,
  animate = true,
  delay = 0,
  className,
  ...props
}: ForgeStatCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  const content = (
    <div
      ref={ref}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/30 bg-card/50 p-6 text-center',
        'hover:border-primary/20 hover:shadow-md transition-all duration-300',
        className
      )}
      {...props}
    >
      {/* Hover gradient background */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        aria-hidden="true"
      >
        <div className={cn('absolute inset-0 bg-gradient-to-br from-primary/8 via-amber-400/3 to-cyan-400/8')} />
      </div>

      <div className="relative">
        <div className={forgeTypography.statNumber}>
          <span className="tabular-nums">{prefix}{value.toLocaleString()}{suffix}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
        {change && (
          <p className={cn(
            'text-xs font-medium mt-0.5',
            changeUp ? 'text-green-600 dark:text-green-400' : 'text-destructive'
          )}>
            {change}
          </p>
        )}
      </div>
    </div>
  )

  if (!animate) return content

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
    >
      {content}
    </motion.div>
  )
}

// ─── ForgeBackground ───
// The signature section background. Every section in ExamForge
// uses branded background patterns — not generic gradients.

interface ForgeBackgroundProps {
  variant?: 'subtle' | 'medium' | 'strong' | 'hero'
  /** Enable floating orbs */
  orbs?: boolean
  /** Enable mesh grid pattern */
  mesh?: boolean
  /** Enable ambient particles */
  particles?: boolean
  children?: ReactNode
  className?: string
}

export function ForgeBackground({
  variant = 'subtle',
  orbs = false,
  mesh = false,
  particles = false,
  children,
  className,
}: ForgeBackgroundProps) {
  const opacityMap = { subtle: '0.4', medium: '0.7', strong: '1', hero: '1' }

  return (
    <div className={cn('absolute inset-0 -z-10', className)} aria-hidden="true">
      {/* Base gradient — always uses Forge gradient (indigo → ember → neural) */}
      <div className={cn(
        'absolute inset-0 bg-gradient-to-br from-primary/8 via-amber-400/3 to-cyan-400/5',
        variant === 'hero' && 'from-primary/12 via-amber-400/5 to-cyan-400/8',
      )} />

      {/* Floating gradient orbs */}
      {orbs && (
        <>
          <div className="absolute top-[-10%] left-[10%] h-[500px] w-[500px] rounded-full bg-primary/8 blur-[120px] animate-float" />
          <div className="absolute bottom-[-5%] right-[15%] h-[400px] w-[400px] rounded-full bg-amber-400/6 blur-[120px] animate-float-slow" />
          <div className="absolute top-[40%] right-[5%] h-[300px] w-[300px] rounded-full bg-cyan-400/5 blur-[100px] animate-float" />
        </>
      )}

      {/* Mesh grid pattern — uses branded primary color, not gray */}
      {mesh && (
        <div
          className={cn('absolute inset-0', `opacity-[${opacityMap[variant]}]`)}
          style={{
            backgroundImage: `linear-gradient(rgba(${forgePatternColors.primaryRgb}, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(${forgePatternColors.primaryRgb}, 0.04) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
      )}

      {/* Subtle dot grid overlay */}
      {particles && (
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `radial-gradient(rgba(${forgePatternColors.primaryRgb}, 0.3) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      )}

      {children}
    </div>
  )
}

// ─── ForgeDivider ───
// The signature section divider. A gradient line that transitions
// from transparent → primary → ember → transparent.

interface ForgeDividerProps {
  className?: string
}

export function ForgeDivider({ className }: ForgeDividerProps) {
  return (
    <div className={cn('relative h-px w-full', className)} aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent" />
    </div>
  )
}

// ─── ForgeStarRating ───
// The signature star rating. Uses brand gold, not generic amber.

interface ForgeStarRatingProps {
  rating: number
  max?: number
  size?: 'sm' | 'md'
  animate?: boolean
  isInView?: boolean
}

export function ForgeStarRating({
  rating,
  max = 5,
  size = 'sm',
  animate = true,
  isInView = true,
}: ForgeStarRatingProps) {
  const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <motion.div
          key={i}
          initial={animate ? { opacity: 0, scale: 0, rotate: -30 } : {}}
          animate={isInView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.3 + i * 0.08 }}
        >
          <svg
            className={cn(starSize, i < rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')}
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </motion.div>
      ))}
    </div>
  )
}
