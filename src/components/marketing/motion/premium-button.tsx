'use client'

import { useRef, useState, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { springs, durations, easings } from './motion-primitives'
import { Check } from 'lucide-react'

// ============================================================================
// ExamForge AI — Premium Button Component
// ============================================================================
// World-class button microinteractions inspired by Stripe, Linear, Vercel.
// Features:
//   - Magnetic cursor attraction
//   - Ripple click effect
//   - Depth shadow on hover
//   - Soft scale on press
//   - Animated arrow on hover
//   - Success state with animated checkmark
//   - Loading shimmer state
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'
type ButtonState = 'idle' | 'loading' | 'success'

interface PremiumButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  /** Show animated arrow that moves on hover */
  arrow?: boolean
  /** Enable magnetic cursor attraction */
  magnetic?: boolean
  /** Enable ripple click effect */
  ripple?: boolean
  /** External state control */
  state?: ButtonState
  /** Full width */
  fullWidth?: boolean
  className?: string
  onClick?: () => void
  disabled?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30',
  secondary:
    'border border-border/50 bg-card/80 backdrop-blur-sm text-foreground hover:border-primary/30 hover:bg-primary/5 hover:shadow-lg',
  ghost:
    'text-foreground hover:bg-muted/50',
  destructive:
    'bg-destructive text-white shadow-lg shadow-destructive/20 hover:shadow-xl hover:shadow-destructive/30',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-6 text-base gap-2 rounded-xl',
  lg: 'h-13 px-8 text-base gap-2 rounded-xl',
}

export function PremiumButton({
  children,
  variant = 'primary',
  size = 'md',
  arrow = false,
  magnetic = true,
  ripple = true,
  state = 'idle',
  fullWidth = false,
  className,
  onClick,
  disabled = false,
}: PremiumButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 })

  // Magnetic cursor effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!magnetic || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const distX = e.clientX - centerX
    const distY = e.clientY - centerY
    const dist = Math.sqrt(distX * distX + distY * distY)
    const maxDist = 150

    if (dist < maxDist) {
      const strength = (1 - dist / maxDist) * 0.2
      setMagneticOffset({ x: distX * strength, y: distY * strength })
    } else {
      setMagneticOffset({ x: 0, y: 0 })
    }
  }, [magnetic])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setMagneticOffset({ x: 0, y: 0 })
  }, [])

  // Ripple effect
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const id = Date.now()
      setRipples((prev) => [...prev, { x, y, id }])
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600)
    }
    onClick?.()
  }, [ripple, onClick])

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={handleClick}
      style={{
        x: magneticOffset.x,
        y: magneticOffset.y,
      }}
      animate={{
        scale: isPressed ? 0.97 : isHovered ? 1.02 : 1,
        y: isHovered && !isPressed ? -1 : 0,
      }}
      transition={springs.snappy}
      className={cn(
        'relative inline-flex items-center justify-center font-medium',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:pointer-events-none',
        'overflow-hidden',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={state !== 'idle' || disabled}
    >
      {/* Ripple effects */}
      {ripples.map((ripple) => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none bg-white/20"
          style={{
            left: ripple.x,
            top: ripple.y,
            translateX: '-50%',
            translateY: '-50%',
          }}
          initial={{ width: 0, height: 0, opacity: 0.5 }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* Loading shimmer */}
      <AnimatePresence mode="wait">
        {state === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <span className="relative flex items-center gap-inherit">
        {state === 'success' ? (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springs.bouncy}
            className="flex items-center gap-2"
          >
            <Check className="h-4 w-4" />
            <span>Done</span>
          </motion.div>
        ) : (
          <>
            {children}
            {arrow && (
              <motion.span
                animate={{ x: isHovered ? 4 : 0 }}
                transition={springs.snappy}
                className="inline-flex"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </motion.span>
            )}
          </>
        )}
      </span>
    </motion.button>
  )
}

// ============================================================================
// Premium Link Button — For Link-based CTAs with premium interactions
// ============================================================================

interface PremiumLinkButtonProps {
  children: ReactNode
  href: string
  variant?: ButtonVariant
  size?: ButtonSize
  arrow?: boolean
  className?: string
  onClick?: () => void
}

export function PremiumLinkButton({
  children,
  href,
  variant = 'primary',
  size = 'md',
  arrow = true,
  className,
  onClick,
}: PremiumLinkButtonProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.a
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{
        scale: isHovered ? 1.02 : 1,
        y: isHovered ? -1 : 0,
      }}
      whileTap={{ scale: 0.97 }}
      transition={springs.snappy}
      className={cn(
        'relative inline-flex items-center justify-center font-medium',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'overflow-hidden rounded-xl',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      onClick={onClick}
    >
      {children}
      {arrow && (
        <motion.span
          animate={{ x: isHovered ? 4 : 0 }}
          transition={springs.snappy}
          className="ml-1 inline-flex"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </motion.span>
      )}
    </motion.a>
  )
}
