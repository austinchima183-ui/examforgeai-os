import type { Variants, Transition, TargetAndTransition } from 'framer-motion'

const isReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const instant: Transition = { duration: 0 }

export const springSnappy: Transition = { type: 'spring', stiffness: 400, damping: 30 }
export const springBouncy: Transition = { type: 'spring', stiffness: 300, damping: 20 }
export const springGentle: Transition = { type: 'spring', stiffness: 150, damping: 20 }

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2 } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: springSnappy },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
}

export const bounceIn: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: { opacity: 1, scale: 1, transition: springBouncy },
  exit: { opacity: 0, scale: 0.5 },
}

export function stagger(index: number, base = 0.05): Transition {
  return { delay: index * base, ...springGentle }
}

export const listVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
  exit: { opacity: 0, transition: { staggerChildren: 0.03 } },
}

export const listItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
}

export const cardHover: TargetAndTransition = {
  scale: 1.02,
  boxShadow: '0 8px 30px rgb(0,0,0,0.08)',
  transition: springSnappy,
}

export const buttonPress: TargetAndTransition = {
  scale: 0.97,
  transition: { duration: 0.1 },
}

export const successPulse: Variants = {
  initial: { scale: 1 },
  pulse: { scale: [1, 1.15, 1], transition: { duration: 0.4 } },
}

export const shimmerGradient = {
  background: 'linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.08) 50%, transparent 100%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
}

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.2 } },
}

export function getMotionValue<T>(normal: T, reduced: T): T {
  return isReducedMotion() ? reduced : normal
}
