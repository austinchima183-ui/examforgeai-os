// ============================================================================
// ExamForge AI — Class Name Utilities
// ============================================================================
// Extended class name utilities including:
// - cn() — existing class name merger (re-exported for convenience)
// - cva() — class variance authority helper
// - focusRing() — consistent focus ring classes
// - screenReaderOnly() — sr-only utility classes
// ============================================================================

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// ──────────────────────────────────────────────────────────────
// cn() — Class Name Merger (re-export)
// ──────────────────────────────────────────────────────────────

/**
 * Merge class names with proper Tailwind CSS conflict resolution.
 *
 * Combines `clsx` (for conditional class composition) with `twMerge`
 * (for intelligent Tailwind class deduplication and override handling).
 *
 * @example
 * ```ts
 * cn('px-4 py-2', 'px-6') // → 'py-2 px-6' (px-4 is overridden)
 * cn('text-base', isActive && 'font-bold', className)
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ──────────────────────────────────────────────────────────────
// cva() — Class Variance Authority Helper
// ──────────────────────────────────────────────────────────────

type VariantKey = string

interface CvaConfig {
  /** Base class names that always apply */
  base?: ClassValue
  /** Variant definitions mapping variant name → value → classes */
  variants?: Record<VariantKey, Record<string, ClassValue>>
  /** Default variant values */
  defaultVariants?: Record<VariantKey, string>
  /** Compound variants: apply classes when multiple variants match */
  compoundVariants?: Array<Record<VariantKey, string> & { class?: ClassValue }>
}

interface CvaFunction {
  (_props?: Record<VariantKey, string>): string
  /** The raw config for introspection */
  config: CvaConfig
}

/**
 * Class Variance Authority helper — create variant-driven class compositions.
 *
 * Simplified version of the `class-variance-authority` package API
 * but integrated with our `cn()` utility for Tailwind merging.
 *
 * @param config - CVA configuration with base, variants, defaults, and compounds
 * @returns A function that computes classes from variant props
 *
 * @example
 * ```ts
 * const button = cva({
 *   base: 'inline-flex items-center rounded-md font-medium',
 *   variants: {
 *     variant: {
 *       default: 'bg-primary text-primary-foreground',
 *       destructive: 'bg-destructive text-destructive-foreground',
 *       outline: 'border border-input bg-background',
 *     },
 *     size: {
 *       default: 'h-10 px-4 py-2',
 *       sm: 'h-9 px-3',
 *       lg: 'h-11 px-8',
 *     },
 *   },
 *   defaultVariants: {
 *     variant: 'default',
 *     size: 'default',
 *   },
 *   compoundVariants: [
 *     { variant: 'outline', size: 'lg', class: 'border-2' },
 *   ],
 * })
 *
 * button() // base + default variant classes
 * button({ variant: 'destructive', size: 'sm' })
 * ```
 */
export function cva(config: CvaConfig): CvaFunction {
  const { base, variants, defaultVariants, compoundVariants } = config

  const fn = (props?: Record<VariantKey, string>): string => {
    const resolvedVariants = { ...defaultVariants, ...props }

    const classValues: ClassValue[] = [base]

    // Apply variant classes
    if (variants) {
      for (const [variantKey, variantValues] of Object.entries(variants)) {
        const variantValue = resolvedVariants[variantKey]
        if (variantValue && variantValues[variantValue]) {
          classValues.push(variantValues[variantValue])
        }
      }
    }

    // Apply compound variant classes
    if (compoundVariants) {
      for (const compound of compoundVariants) {
        const matches = Object.entries(compound).every(([key, value]) => {
          if (key === 'class') return true
          return resolvedVariants[key] === value
        })
        if (matches && compound.class) {
          classValues.push(compound.class)
        }
      }
    }

    return cn(...classValues)
  }

  fn.config = config
  return fn
}

// ──────────────────────────────────────────────────────────────
// focusRing() — Consistent Focus Ring Classes
// ──────────────────────────────────────────────────────────────

interface FocusRingOptions {
  /** Color variant (default: 'ring') */
  color?: 'ring' | 'primary' | 'destructive' | 'warning'
  /** Ring offset (default: true) */
  offset?: boolean
  /** Ring width (default: 2) */
  width?: 2 | 3 | 4
  /** Whether to include focus-visible only (default: true) */
  visibleOnly?: boolean
}

/**
 * Generate consistent focus ring classes for interactive elements.
 *
 * @param options - Focus ring configuration
 * @returns Tailwind CSS class string for focus ring
 *
 * @example
 * ```tsx
 * <button className={cn('rounded-md', focusRing())}>Click</button>
 * // → 'rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden'
 *
 * <button className={cn('rounded-md', focusRing({ color: 'primary', width: 3 }))}>
 *   Click
 * </button>
 * ```
 */
export function focusRing(options: FocusRingOptions = {}): string {
  const {
    color = 'ring',
    offset = true,
    width = 2,
    visibleOnly = true,
  } = options

  const focusPrefix = visibleOnly ? 'focus-visible' : 'focus'
  const colorMap: Record<string, string> = {
    ring: 'ring-ring',
    primary: 'ring-primary',
    destructive: 'ring-destructive',
    warning: 'ring-warning',
  }

  const classes = [
    `${focusPrefix}:ring-${width}`,
    `${focusPrefix}:${colorMap[color] ?? 'ring-ring'}`,
    `${focusPrefix}:outline-hidden`,
  ]

  if (offset) {
    classes.push(`${focusPrefix}:ring-offset-2`)
    classes.push(`${focusPrefix}:ring-offset-background`)
  }

  return classes.join(' ')
}

// ──────────────────────────────────────────────────────────────
// screenReaderOnly() — sr-only Utility Classes
// ──────────────────────────────────────────────────────────────

/**
 * Generate screen-reader-only utility classes.
 * Content is visually hidden but accessible to assistive technology.
 *
 * @param options - Configuration
 * @returns Tailwind CSS class string
 *
 * @example
 * ```tsx
 * <span className={screenReaderOnly()}>Only for screen readers</span>
 * ```
 */
export function screenReaderOnly(options: {
  /** Whether to make it focusable (becomes visible on focus, e.g., skip links) */
  focusable?: boolean
} = {}): string {
  const { focusable = false } = options

  if (focusable) {
    return 'sr-only focus:not-sr-only focus:absolute focus:z-50 focus:h-auto focus:w-auto focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:shadow-md'
  }

  return 'sr-only'
}
