// ============================================================================
// ExamForge AI — Environment Validator (Startup Fail-Fast)
// ============================================================================
// Thin wrapper around the comprehensive env-validation.ts module.
// Provides the `validateEnv()` entry point called at app startup.
//
// Categories:
//   CRITICAL  — app refuses to start without these
//   REQUIRED  — feature degrades gracefully without these
//   OPTIONAL  — nice-to-have, no warnings if missing
// ============================================================================
//
// IMPORTANT: This module never logs or exposes secret values in error messages.
// ============================================================================

import {
  validateEnvironmentOrFail,
  validateEnvironment,
  formatValidationReport,
  type EnvValidationResult,
  type EnvIssue,
  type EnvSeverity,
} from './env-validation'

// ── Re-exports for convenience ──────────────────────────────────────────────

export type { EnvValidationResult, EnvIssue, EnvSeverity }

// ── Category Definitions ────────────────────────────────────────────────────

/**
 * Variable categories for documentation and runtime checks.
 *
 * CRITICAL  — App will NOT start without these (Supabase core, secrets, DB)
 * REQUIRED  — A feature will be degraded/disabled without these (AI, payments)
 * OPTIONAL  — Nice-to-have extras (Sentry, Redis, email)
 */
export const ENV_CATEGORIES = {
  CRITICAL: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',   // server-only
    'NEXT_PUBLIC_APP_URL',
    'NODE_ENV',
    'SESSION_TOKEN_SECRET',        // server-only
    'CSRF_SECRET',                 // server-only
    'ENCRYPTION_KEY',              // server-only
  ] as const,

  REQUIRED: [
    'OPENAI_API_KEY',              // server-only — AI features
    'GEMINI_API_KEY',              // server-only — AI features
    'FLUTTERWAVE_SECRET_KEY',      // server-only — payments
    'FLUTTERWAVE_PUBLIC_KEY',      // client-side — payments
    'FLUTTERWAVE_WEBHOOK_HASH',    // server-only — payment webhooks
    'RESEND_API_KEY',              // server-only — transactional email
    'WEBHOOK_SECRET',              // server-only — webhook verification
  ] as const,

  OPTIONAL: [
    'NEXT_PUBLIC_SENTRY_DSN',
    'SENTRY_AUTH_TOKEN',
    'SENTRY_ORG',
    'SENTRY_PROJECT',
    'REDIS_URL',
    'EMAIL_FROM_ADDRESS',
  ] as const,
} as const

// ── Server-Only Guard ───────────────────────────────────────────────────────

/**
 * List of env var names that MUST NEVER be prefixed with NEXT_PUBLIC_.
 * If any of these leak to the client bundle, it's a critical security issue.
 */
export const SERVER_ONLY_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'FLUTTERWAVE_SECRET_KEY',
  'RESEND_API_KEY',
  'ENCRYPTION_KEY',
  'WEBHOOK_SECRET',
  'SENTRY_AUTH_TOKEN',
  'REDIS_URL',
  'SESSION_TOKEN_SECRET',
  'CSRF_SECRET',
] as const

// ── Primary Entry Point ─────────────────────────────────────────────────────

/**
 * Validate environment variables at application startup.
 * Calls the underlying `validateEnvironmentOrFail()` which throws
 * if any CRITICAL variable is missing or invalid in production.
 *
 * Call this once at the top of:
 *   - `src/app/layout.tsx` (server component)
 *   - `instrumentation.ts` (Next.js server startup)
 *   - Any server-side entry point
 *
 * @throws {Error} If any CRITICAL env var is missing/invalid
 */
export function validateEnv(): void {
  validateEnvironmentOrFail()
}

// ── Non-throwing Variant ─────────────────────────────────────────────────────

/**
 * Validate environment variables without throwing.
 * Useful for health-check endpoints or admin dashboards.
 *
 * @returns Full validation result with all issues
 */
export function checkEnv(): EnvValidationResult {
  return validateEnvironment()
}

// ── Report Generator ────────────────────────────────────────────────────────

/**
 * Generate a human-readable validation report.
 * Safe to log — never includes secret values.
 */
export function getEnvReport(): string {
  return formatValidationReport(validateEnvironment())
}

// ── Typed Accessor ──────────────────────────────────────────────────────────

/**
 * Get a required environment variable, throwing if missing.
 * Use this instead of raw `process.env` access for critical vars.
 *
 * IMPORTANT: Never use this for values that could be secrets
 * in client-side code. The throw message only includes the
 * variable NAME, never the VALUE.
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Get an optional environment variable with a fallback.
 * Returns the fallback silently if the variable is not set.
 */
export function getEnv(name: string, fallback: string = ''): string {
  return process.env[name] || fallback
}
