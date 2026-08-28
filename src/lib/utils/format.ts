// ============================================================================
// ExamForge AI — Format Utilities
// ============================================================================
// Common formatting functions for dates, currency, numbers, and percentages.
// Uses date-fns for locale-aware date formatting and relative time.
// ============================================================================

import {
  format,
  formatDistanceToNow,
  parseISO,
  isValid,
} from 'date-fns'

// ──────────────────────────────────────────────────────────────
// Date Formatting
// ──────────────────────────────────────────────────────────────

/**
 * Format a date string or Date object into a human-readable format.
 *
 * @param date - ISO date string or Date object
 * @param pattern - date-fns format pattern (default: 'MMM d, yyyy')
 * @returns Formatted date string, or 'Invalid date' if parsing fails
 *
 * @example
 * ```ts
 * formatDate('2024-01-15') // → 'Jan 15, 2024'
 * formatDate('2024-01-15', 'MMMM d, yyyy') // → 'January 15, 2024'
 * ```
 */
export function formatDate(
  date: string | Date,
  pattern: string = 'MMM d, yyyy'
): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return 'Invalid date'
  return format(parsed, pattern)
}

/**
 * Format a date as a relative time string (e.g., "3 days ago", "in 2 hours").
 *
 * @param date - ISO date string or Date object
 * @returns Relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime('2024-01-15T10:00:00Z') // → '2 hours ago'
 * ```
 */
export function formatRelativeTime(date: string | Date): string {
  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return 'Invalid date'
  return formatDistanceToNow(parsed, { addSuffix: true })
}

// ──────────────────────────────────────────────────────────────
// Currency Formatting
// ──────────────────────────────────────────────────────────────

/**
 * Format a number as currency.
 *
 * @param amount - The numeric amount
 * @param currency - ISO 4217 currency code (default: 'USD')
 * @param locale - BCP 47 locale string (default: 'en-US')
 * @returns Formatted currency string
 *
 * @example
 * ```ts
 * formatCurrency(1234.5) // → '$1,234.50'
 * formatCurrency(1234.5, 'EUR', 'de-DE') // → '1.234,50 €'
 * ```
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ──────────────────────────────────────────────────────────────
// Number Formatting
// ──────────────────────────────────────────────────────────────

/**
 * Format a number with thousands separators.
 *
 * @param value - The numeric value
 * @param options - Intl.NumberFormat options
 * @returns Formatted number string
 *
 * @example
 * ```ts
 * formatNumber(1234567) // → '1,234,567'
 * formatNumber(1234.5, { minimumFractionDigits: 2 }) // → '1,234.50'
 * ```
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat('en-US', options).format(value)
}

// ──────────────────────────────────────────────────────────────
// Percentage Formatting
// ──────────────────────────────────────────────────────────────

/**
 * Format a number as a percentage.
 *
 * @param value - The numeric value (0-100 scale)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * ```ts
 * formatPercentage(85.5) // → '85.5%'
 * formatPercentage(85.567, 2) // → '85.57%'
 * ```
 */
export function formatPercentage(
  value: number,
  decimals: number = 1
): string {
  return `${value.toFixed(decimals)}%`
}
