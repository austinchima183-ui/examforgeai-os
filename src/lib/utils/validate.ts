// ============================================================================
// ExamForge AI — Validation Utilities
// ============================================================================
// Common validation functions for emails, phone numbers, URLs, and UUIDs.
// Re-exports Zod primitives for schema composition.
// ============================================================================

import { z } from 'zod'

// ──────────────────────────────────────────────────────────────
// Email Validation
// ──────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/**
 * Validate an email address format.
 *
 * @param email - The email string to validate
 * @returns True if the email format is valid
 *
 * @example
 * ```ts
 * isValidEmail('user@example.com') // → true
 * isValidEmail('invalid-email') // → false
 * ```
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

// ──────────────────────────────────────────────────────────────
// Phone Validation
// ──────────────────────────────────────────────────────────────

const PHONE_REGEX = /^\+?[1-9]\d{6,14}$/

/**
 * Validate an international phone number format (E.164-like).
 *
 * @param phone - The phone string to validate
 * @returns True if the phone format is valid
 *
 * @example
 * ```ts
 * isValidPhone('+1234567890') // → true
 * isValidPhone('123') // → false
 * ```
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.replace(/[\s()-]/g, ''))
}

// ──────────────────────────────────────────────────────────────
// URL Validation
// ──────────────────────────────────────────────────────────────

/**
 * Validate a URL string.
 *
 * @param url - The URL string to validate
 * @returns True if the URL is valid
 *
 * @example
 * ```ts
 * isValidUrl('https://example.com') // → true
 * isValidUrl('not-a-url') // → false
 * ```
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// UUID Validation
// ──────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validate a UUID v1-v5 string format.
 *
 * @param uuid - The UUID string to validate
 * @returns True if the UUID format is valid
 *
 * @example
 * ```ts
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000') // → true
 * isValidUUID('not-a-uuid') // → false
 * ```
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid)
}

// ──────────────────────────────────────────────────────────────
// Zod Re-exports
// ──────────────────────────────────────────────────────────────

/**
 * Pre-built Zod schema for email validation.
 */
export const emailSchema = z.string().email()

/**
 * Pre-built Zod schema for URL validation.
 */
export const urlSchema = z.string().url()

/**
 * Pre-built Zod schema for UUID validation.
 */
export const uuidSchema = z.string().uuid()

/**
 * Pre-built Zod schema for phone validation (E.164-like).
 */
export const phoneSchema = z.string().regex(
  PHONE_REGEX,
  'Invalid phone number format'
)
