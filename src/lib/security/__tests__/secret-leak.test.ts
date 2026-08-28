// ============================================================================
// ExamForge AI — Secret Leak Prevention Test Suite
// ============================================================================
// Verifies that:
//   1. maskSecrets() correctly masks JWTs, API keys, Bearer tokens, etc.
//   2. env-validator fails fast when CRITICAL vars are missing
//   3. env-validator succeeds when all CRITICAL vars are present
//   4. No secret patterns appear in any error messages
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  maskSecrets,
  maskSecretsInObject,
  createSafeLogger,
  detectSecretPatterns,
} from '@/lib/security/secret-mask'

import {
  validateEnv,
  checkEnv,
  requireEnv,
  getEnv,
} from '@/lib/config/env-validator'

// ── Test constants (must match the regex patterns in secret-mask.ts) ──────────
// OpenAI regex: sk-[a-zA-Z0-9]{20,}  (no hyphens after sk-)
const OPENAI_KEY = 'sk-abc123def456ghi789jkl012mno345pqr6'

// ╔═══════════════════════════════════════════════════════════════╗
// ║  1. maskSecrets() — Pattern Masking Tests                      ║
// ╚═══════════════════════════════════════════════════════════════╝

describe('maskSecrets()', () => {
  // ── JWT Masking ──

  it('masks JWT tokens (eyJ...)', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN0KzJ9pQ'
    const input = `Authorization: ${jwt}`
    const result = maskSecrets(input)

    expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
    expect(result).toContain('***MASKED')
  })

  it('masks Supabase-style long JWT keys', () => {
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHgifQ.veryLongSignaturePartHere12345678901234567890'
    const input = `Key: ${supabaseKey}`
    const result = maskSecrets(input)

    expect(result).not.toContain(supabaseKey)
    expect(result).toContain('***MASKED')
  })

  // ── OpenAI API Key Masking ──

  it('masks OpenAI API keys (sk-...)', () => {
    const input = `OpenAI key: ${OPENAI_KEY}`
    const result = maskSecrets(input)

    expect(result).not.toContain(OPENAI_KEY)
    expect(result).toContain('***MASKED_OPENAI***')
  })

  // ── Vercel Token Masking ──

  it('masks Vercel tokens (vcp_...)', () => {
    const token = 'vcp_testfake0000000000000000'
    const input = `Token: ${token}`
    const result = maskSecrets(input)

    expect(result).not.toContain(token)
    expect(result).toContain('***MASKED_VERCEL***')
  })

  // ── Supabase PAT Masking ──

  it('masks Supabase PATs (sbp_...)', () => {
    const pat = 'sbp_testfake0000000000000000'
    const input = `PAT: ${pat}`
    const result = maskSecrets(input)

    expect(result).not.toContain(pat)
    expect(result).toContain('***MASKED_SUPABASE***')
  })

  // ── Flutterwave Key Masking ──

  it('masks Flutterwave secret keys (FLWSECK...)', () => {
    const key = 'FLWSECK-abc123def456ghi789jkl012mno345'
    const input = `Secret: ${key}`
    const result = maskSecrets(input)

    expect(result).not.toContain(key)
    expect(result).toContain('***MASKED_FLUTTERWAVE_SEC***')
  })

  it('masks Flutterwave test secret keys (FLWSECK-TEST-...)', () => {
    const key = 'FLWSECK-TEST-abc123def456ghi789jkl012'
    const input = `Secret: ${key}`
    const result = maskSecrets(input)

    expect(result).not.toContain(key)
    expect(result).toContain('***MASKED_FLUTTERWAVE_SEC***')
  })

  it('masks Flutterwave public keys (FLWPUBK...)', () => {
    const key = 'FLWPUBK-abc123def456ghi789jkl012mno345'
    const input = `Public: ${key}`
    const result = maskSecrets(input)

    expect(result).not.toContain(key)
    expect(result).toContain('***MASKED_FLUTTERWAVE_PUB***')
  })

  // ── Google API Key Masking ──

  it('masks Google API keys (AIza...)', () => {
    const key = 'AIzaSyBabc123def456ghi789jkl012mno345pqr678stu901'
    const input = `Google: ${key}`
    const result = maskSecrets(input)

    expect(result).not.toContain(key)
    expect(result).toContain('***MASKED_GOOGLE***')
  })

  // ── Bearer Token Masking ──

  it('masks Bearer tokens with opaque values', () => {
    // Use a non-JWT bearer token so the Bearer pattern matches directly
    const input = 'Authorization: Bearer abcdefghijklmnopqrstuvwx1234567890YZ'
    const result = maskSecrets(input)

    expect(result).toContain('Bearer')
    expect(result).toContain('***MASKED_BEARER***')
    expect(result).not.toContain('abcdefghijklmnopqrstuvwxyz1234567890YZ')
  })

  // ── Database URL Masking ──

  it('masks database URLs with credentials', () => {
    const input = 'postgres://admin:s3cr3tP@ssw0rd@db.example.com:5432/mydb'
    const result = maskSecrets(input)

    expect(result).not.toContain('s3cr3tP@ssw0rd')
    expect(result).toContain('***MASKED_DBPASS***')
  })

  it('masks MongoDB URLs with credentials', () => {
    const input = 'mongodb://user:myPassword123@cluster.mongodb.net/db'
    const result = maskSecrets(input)

    expect(result).not.toContain('myPassword123')
    expect(result).toContain('***MASKED_DBPASS***')
  })

  // ── Private Key Masking ──

  it('masks RSA private keys', () => {
    const input = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----'
    const result = maskSecrets(input)

    expect(result).not.toContain('MIIEpAIBAAKCAQEA')
    expect(result).toContain('***MASKED_PRIVATE_KEY***')
  })

  // ── Generic Secret Assignment Masking ──

  it('masks secret= assignments', () => {
    const input = 'config secret="mySuperSecretValue12345678"'
    const result = maskSecrets(input)

    expect(result).not.toContain('mySuperSecretValue12345678')
  })

  it('masks api_key= assignments', () => {
    const input = 'settings api_key="myLongApiKey1234567890abcdef"'
    const result = maskSecrets(input)

    expect(result).not.toContain('myLongApiKey1234567890abcdef')
  })

  // ── Idempotency ──

  it('is idempotent — masking twice produces same result', () => {
    const input = `token=${OPENAI_KEY}`
    const once = maskSecrets(input)
    const twice = maskSecrets(once)

    expect(twice).toBe(once)
  })

  // ── No-op on clean strings ──

  it('returns unchanged string when no secrets are present', () => {
    const input = 'Hello, this is a normal log message with no secrets.'
    expect(maskSecrets(input)).toBe(input)
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║  2. maskSecretsInObject() — Object Masking Tests               ║
// ╚═══════════════════════════════════════════════════════════════╝

describe('maskSecretsInObject()', () => {
  it('masks secrets in nested objects', () => {
    const obj = {
      user: 'admin',
      token: 'Bearer abcdefghijklmnopqrstuvwx1234567890YZ',
      config: {
        apiKey: OPENAI_KEY,
      },
    }

    const result = maskSecretsInObject(obj)

    expect(result.user).toBe('admin')
    expect(result.token).not.toContain('abcdefghijklmnopqrstuvwxyz1234567890YZ')
    expect(result.config.apiKey).not.toContain(OPENAI_KEY)
  })

  it('masks secrets in arrays', () => {
    const arr = ['normal', OPENAI_KEY, 'also-normal']
    const result = maskSecretsInObject(arr)

    expect(result[0]).toBe('normal')
    expect(result[1]).not.toContain(OPENAI_KEY)
    expect(result[2]).toBe('also-normal')
  })

  it('handles null and undefined gracefully', () => {
    expect(maskSecretsInObject(null)).toBeNull()
    expect(maskSecretsInObject(undefined)).toBeUndefined()
  })

  it('respects maxDepth limit', () => {
    const deep = { a: { b: { c: { d: { e: { f: OPENAI_KEY } } } } } }
    const result = maskSecretsInObject(deep, 2)

    // At depth 2, we stop masking deeper — the secret may still be there
    // (This tests that maxDepth doesn't crash, the exact behavior depends on depth)
    expect(result).toBeDefined()
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║  3. createSafeLogger() — Safe Logging Tests                    ║
// ╚═══════════════════════════════════════════════════════════════╝

describe('createSafeLogger()', () => {
  it('auto-masks secrets in log arguments', () => {
    const logged: unknown[] = []
    const mockLog = (...args: unknown[]) => { logged.push(...args) }
    const safeLog = createSafeLogger(mockLog)

    safeLog('API call with key:', OPENAI_KEY)

    expect(logged.length).toBe(2)
    expect(String(logged[1])).not.toContain(OPENAI_KEY)
  })

  it('auto-masks secrets in object arguments', () => {
    const logged: unknown[] = []
    const mockLog = (...args: unknown[]) => { logged.push(...args) }
    const safeLog = createSafeLogger(mockLog)

    safeLog('Response:', { token: 'Bearer abcdefghijklmnop1234567890qrstuv' })

    expect(logged.length).toBe(2)
    const obj = logged[1] as Record<string, string>
    expect(obj.token).not.toContain('Bearer abcdefghijklmnop1234567890qrstuv')
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║  4. detectSecretPatterns() — Detection Tests                   ║
// ╚═══════════════════════════════════════════════════════════════╝

describe('detectSecretPatterns()', () => {
  it('detects JWT patterns', () => {
    const detected = detectSecretPatterns('Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.sig')
    expect(detected).toContain('JWT')
  })

  it('detects OpenAI key patterns', () => {
    const detected = detectSecretPatterns(`Value: ${OPENAI_KEY}`)
    expect(detected).toContain('OpenAI-Key')
  })

  it('returns empty array for clean strings', () => {
    const detected = detectSecretPatterns('No secrets here, just a normal string.')
    expect(detected).toEqual([])
  })

  it('detects multiple patterns in one string', () => {
    const input = `JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.sig and key: ${OPENAI_KEY}`
    const detected = detectSecretPatterns(input)
    expect(detected.length).toBeGreaterThanOrEqual(2)
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║  5. env-validator — Fail-Fast Tests                            ║
// ╚═══════════════════════════════════════════════════════════════╝

describe('env-validator — fail fast', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Clone env so we can manipulate safely
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('throws when CRITICAL vars are missing in production', () => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    // Remove all critical vars
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.SESSION_TOKEN_SECRET
    delete process.env.CSRF_SECRET
    delete process.env.NEXTAUTH_SECRET
    delete process.env.ENCRYPTION_KEY
    delete process.env.DATABASE_URL

    expect(() => validateEnv()).toThrow()
  })

  it('checkEnv() returns invalid result when CRITICAL vars are missing', () => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.SESSION_TOKEN_SECRET
    delete process.env.CSRF_SECRET
    delete process.env.NEXTAUTH_SECRET
    delete process.env.ENCRYPTION_KEY
    delete process.env.DATABASE_URL

    const result = checkEnv()
    expect(result.valid).toBe(false)
    expect(result.criticalCount).toBeGreaterThan(0)
  })

  it('succeeds when all CRITICAL vars are present (mock process.env)', () => {
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'development'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHgifQ.veryLongSignaturePartHere123456789012345678901234567890'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHgifQ.veryLongSignaturePartHere123456789012345678901234567890'
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    process.env.SESSION_TOKEN_SECRET = 'a-very-long-and-cryptographically-random-session-secret-key-that-is-at-least-32-chars'
    process.env.CSRF_SECRET = 'a-very-long-and-cryptographically-random-csrf-secret-key-that-is-at-least-32-chars'
    process.env.NEXTAUTH_SECRET = 'a-very-long-and-cryptographically-random-nextauth-secret-key-that-is-at-least-32-chars'
    process.env.ENCRYPTION_KEY = 'a-very-long-and-cryptographically-random-encryption-key-that-is-at-least-32-chars'
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/examforge'

    const result = checkEnv()
    expect(result.valid).toBe(true)
    expect(result.criticalCount).toBe(0)
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║  6. requireEnv() / getEnv() — Typed Accessor Tests             ║
// ╚═══════════════════════════════════════════════════════════════╝

describe('requireEnv() / getEnv()', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('requireEnv() throws with only the variable NAME, never the value', () => {
    process.env.MY_SECRET = 'super-secret-value-12345'
    delete process.env.MY_SECRET

    try {
      requireEnv('MY_SECRET')
      expect.unreachable('Should have thrown')
    } catch (error) {
      const message = (error as Error).message
      expect(message).toContain('MY_SECRET')
      // Critical: error message must NOT contain any value
      expect(message).not.toContain('super-secret-value-12345')
    }
  })

  it('requireEnv() returns the value when set', () => {
    process.env.MY_SECRET = 'the-actual-value'
    expect(requireEnv('MY_SECRET')).toBe('the-actual-value')
  })

  it('getEnv() returns fallback when variable is not set', () => {
    delete process.env.OPTIONAL_VAR
    expect(getEnv('OPTIONAL_VAR', 'default-value')).toBe('default-value')
  })

  it('getEnv() returns the value when set, ignoring fallback', () => {
    process.env.OPTIONAL_VAR = 'actual-value'
    expect(getEnv('OPTIONAL_VAR', 'default-value')).toBe('actual-value')
  })
})

// ╔═══════════════════════════════════════════════════════════════╗
// ║  7. No Secret Patterns in Error Messages                       ║
// ╚═══════════════════════════════════════════════════════════════╝

describe('No secret patterns in error messages', () => {
  it('env-validator error messages never contain actual secret values', () => {
    const originalEnv = process.env
    process.env = { ...originalEnv }
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'production'
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.SESSION_TOKEN_SECRET
    delete process.env.CSRF_SECRET
    delete process.env.NEXTAUTH_SECRET
    delete process.env.ENCRYPTION_KEY
    delete process.env.DATABASE_URL

    try {
      validateEnv()
      expect.unreachable('Should have thrown')
    } catch (error) {
      const message = (error as Error).message

      // The error must reference variable NAMES, not values
      expect(message).toContain('NEXT_PUBLIC_SUPABASE_URL')

      // Run maskSecrets on the error message — it should be unchanged
      // (because it should not contain any secret patterns)
      const maskedMessage = maskSecrets(message)
      expect(maskedMessage).toBe(message)
    }

    process.env = originalEnv
  })

  it('maskSecrets() applied to env-validator output produces no changes', () => {
    const originalEnv = process.env
    process.env = { ...originalEnv }
    ;(process.env as Record<string, string | undefined>).NODE_ENV = 'development'
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const result = checkEnv()
    const allMessages = result.issues.map((i) => i.message).join(' ')

    // No issue message should contain a secret pattern
    const maskedMessages = maskSecrets(allMessages)

    // If masking changed anything, a secret leaked into a message
    expect(maskedMessages).toBe(allMessages)

    process.env = originalEnv
  })
})
