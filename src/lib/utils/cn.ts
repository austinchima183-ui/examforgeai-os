// ============================================================================
// ExamForge AI — ClassName Merger Utility
// ============================================================================
// Merges class names using clsx + tailwind-merge to handle conditional
// classes and Tailwind CSS class conflicts correctly.
// ============================================================================

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
