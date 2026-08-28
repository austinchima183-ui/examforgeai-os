// ============================================================================
// ExamForge AI — Secret Masking Utility
// ============================================================================
// Masks known secret patterns in strings (logs, error messages, debug output).
// Prevents accidental exposure of API keys, JWTs, tokens, and other secrets.
// ============================================================================
//
// Usage:
//   import { maskSecrets } from '@/lib/security/secret-mask'
//   console.log(maskSecrets(`API call with key sk-abc123...`))
//   // → "API call with key sk-***MASKED***"
//
//   logger.error(maskSecrets(`Token: eyJhbGciOi...`))
//   // → "Token: eyJ***MASKED***"
// ============================================================================

// ── Secret Pattern Definitions ──────────────────────────────────────────────

interface SecretPattern {
  /** Human-readable name for debugging/auditing */
  name: string
  /** Regex pattern — must have a capture group for the secret portion */
  pattern: RegExp
  /** Replacement string for the captured secret */
  mask: string
}

const SECRET_PATTERNS: SecretPattern[] = [
  // ── JWTs (eyJ...) ──
  {
    name: 'JWT',
    pattern: /\b(eyJ[A-Za-z0-9_-]{10,}[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)?)\b/g,
    mask: '***MASKED_JWT***',
  },

  // ── OpenAI API Keys (sk-...) ──
  {
    name: 'OpenAI-Key',
    pattern: /\b(sk-[a-zA-Z0-9]{20,})\b/g,
    mask: '***MASKED_OPENAI***',
  },

  // ── Vercel Tokens (vcp_...) ──
  {
    name: 'Vercel-Token',
    pattern: /\b(vcp_[a-zA-Z0-9]{20,})\b/g,
    mask: '***MASKED_VERCEL***',
  },

  // ── Supabase PATs (sbp_...) ──
  {
    name: 'Supabase-PAT',
    pattern: /\b(sbp_[a-zA-Z0-9]{20,})\b/g,
    mask: '***MASKED_SUPABASE***',
  },

  // ── Flutterwave Secret Keys (FLWSECK...) ──
  {
    name: 'Flutterwave-Secret',
    pattern: /\b(FLWSECK(?:-TEST)?-[a-zA-Z0-9-]{10,})\b/g,
    mask: '***MASKED_FLUTTERWAVE_SEC***',
  },

  // ── Flutterwave Public Keys (FLWPUBK...) ──
  {
    name: 'Flutterwave-Public',
    pattern: /\b(FLWPUBK(?:-TEST)?-[a-zA-Z0-9-]{10,})\b/g,
    mask: '***MASKED_FLUTTERWAVE_PUB***',
  },

  // ── Google API Keys (AIza...) ──
  {
    name: 'Google-API-Key',
    pattern: /\b(AIza[A-Za-z0-9_-]{30,})\b/g,
    mask: '***MASKED_GOOGLE***',
  },

  // ── AWS Access Keys (AKIA...) ──
  {
    name: 'AWS-Access-Key',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    mask: '***MASKED_AWS***',
  },

  // ── Bearer Tokens in headers ──
  {
    name: 'Bearer-Token',
    pattern: /(Bearer\s+)([A-Za-z0-9_\-./+]{20,})/g,
    mask: '$1***MASKED_BEARER***',
  },

  // ── Generic Authorization header values ──
  {
    name: 'Auth-Header',
    pattern: /([Aa]uthorization\s*[:=]\s*["']?)([A-Za-z0-9_\-./+]{20,})(["']?)/g,
    mask: '$1***MASKED_AUTH***$3',
  },

  // ── Database URLs with credentials ──
  {
    name: 'DB-URL-Creds',
    pattern: /((?:postgres|mysql|mongodb|redis):\/\/[^:]+:)([^@]+)(@)/g,
    mask: '$1***MASKED_DBPASS***$3',
  },

  // ── Private Keys ──
  {
    name: 'Private-Key',
    pattern: /(-----BEGIN\s+(?:RSA\s+|EC\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+|EC\s+)?PRIVATE\s+KEY-----)/g,
    mask: '***MASKED_PRIVATE_KEY***',
  },

  // ── Generic secret assignments (secret=, key=, token=, password=) ──
  {
    name: 'Secret-Assignment',
    pattern: /((?:secret|key|token|password|api[_-]?key|apikey)\s*[:=]\s*["']?)([A-Za-z0-9_\-./+]{12,})(["']?)/gi,
    mask: '$1***MASKED***$3',
  },
]

// ── Supabase-specific patterns (anon key, service role key) ──

const SUPABASE_KEY_PATTERNS: SecretPattern[] = [
  // Supabase anon key or service role key in URLs or strings
  {
    name: 'Supabase-Anon-Key',
    pattern: /\b(eyJ[A-Za-z0-9_-]{80,})\b/g,
    mask: '***MASKED_SUPABASE_KEY***',
  },
]

// ── Combine all patterns ──

const ALL_PATTERNS: SecretPattern[] = [...SECRET_PATTERNS, ...SUPABASE_KEY_PATTERNS]

// ── Main Masking Function ───────────────────────────────────────────────────

/**
 * Mask known secret patterns in a string.
 *
 * Replaces any detected secrets with safe placeholder strings.
 * Safe to use on log messages, error outputs, debug strings, etc.
 *
 * @param input - The string to scan and mask
 * @returns The string with all detected secrets replaced by mask placeholders
 *
 * @example
 * ```ts
 * maskSecrets('Connecting with key sk-abc123def456...')
 * // → 'Connecting with key ***MASKED_OPENAI***...'
 *
 * maskSecrets('Auth: Bearer eyJhbGciOiJIUzI1NiJ9...')
 * // → 'Auth: Bearer ***MASKED_BEARER***'
 *
 * maskSecrets('DB: postgres://user:s3cr3t@db.example.com/mydb')
 * // → 'DB: postgres://user:***MASKED_DBPASS***@db.example.com/mydb'
 * ```
 */
export function maskSecrets(input: string): string {
  let result = input

  for (const { pattern, mask } of ALL_PATTERNS) {
    // Reset lastIndex for global regexes
    const regex = new RegExp(pattern.source, pattern.flags)
    result = result.replace(regex, mask)
  }

  return result
}

// ── Object Masking ──────────────────────────────────────────────────────────

/**
 * Recursively mask secrets in an object's string values.
 * Returns a new object — never mutates the input.
 *
 * @param obj - The object to scan
 * @param maxDepth - Maximum recursion depth (default: 5)
 * @returns A new object with all string values masked
 */
export function maskSecretsInObject<T>(obj: T, maxDepth: number = 5): T {
  if (maxDepth <= 0) return obj
  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    return maskSecrets(obj) as unknown as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSecretsInObject(item, maxDepth - 1)) as unknown as T
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = maskSecretsInObject(value, maxDepth - 1)
    }
    return result as T
  }

  return obj
}

// ── Convenience: Safe Logger Wrapper ────────────────────────────────────────

/**
 * Create a safe version of a log function that auto-masks secrets.
 *
 * @example
 * ```ts
 * const safeLog = createSafeLogger(console.log)
 * safeLog('API response:', { token: 'eyJhbGci...' })
 * // Logs with token masked
 * ```
 */
export function createSafeLogger(
  logFn: (...args: unknown[]) => void
): (...args: unknown[]) => void {
  return (...args: unknown[]) => {
    const safeArgs = args.map((arg) => {
      if (typeof arg === 'string') return maskSecrets(arg)
      if (typeof arg === 'object' && arg !== null) return maskSecretsInObject(arg)
      return arg
    })
    logFn(...safeArgs)
  }
}

// ── Pattern Detection (without masking) ─────────────────────────────────────

/**
 * Check if a string contains any detectable secret patterns.
 * Returns the names of detected pattern types (without revealing values).
 *
 * Useful for pre-commit hooks or CI checks.
 */
export function detectSecretPatterns(input: string): string[] {
  const detected: string[] = []

  for (const { name, pattern } of ALL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)
    if (regex.test(input)) {
      detected.push(name)
    }
  }

  return detected
}
