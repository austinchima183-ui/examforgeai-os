// ============================================================================
// ExamForge AI — RFC 6238 TOTP (Time-based One-Time Password)
// ============================================================================
// Server-side TOTP implementation using node:crypto — no external deps.
// - generateTotpSecret(): cryptographically random base32 secret
// - verifyTotp(): time-window verification with timing-safe comparison
// - Backup-code hashing helpers (SHA-256, single-use semantics handled by
//   the caller removing used codes).
// Used by /api/settings/security for REAL 2FA (replaces the former fake
// any-6-digits "verification" — a P0 security defect).
// ============================================================================

import { createHmac, createHash, randomBytes, timingSafeEqual } from 'crypto'

// ──────────────────────────────────────────────────────────────
// Base32 (RFC 4648) — standard alphabet for TOTP secrets / otpauth URIs
// ──────────────────────────────────────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

// ──────────────────────────────────────────────────────────────
// Secret generation
// ──────────────────────────────────────────────────────────────

/** Generate a random TOTP secret (160 bits, base32-encoded — standard). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

/** Generate human-friendly backup codes (10 × 8 chars, no ambiguity). */
export function generateBackupCodes(count = 10): string[] {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ' // no I/O/1-confusables
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(8)
    codes.push(Array.from(bytes, (b) => chars[b % chars.length]).join(''))
  }
  return codes
}

// ──────────────────────────────────────────────────────────────
// HOTP / TOTP core (RFC 4226 / RFC 6238)
// ──────────────────────────────────────────────────────────────

const STEP_SECONDS = 30
const DIGITS = 6

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  // Big-endian 64-bit counter (JS numbers safe to 2^53 — far beyond time steps)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)

  const digest = createHmac('sha1', secret).update(buf).digest()

  // Dynamic truncation (RFC 4226 §5.3)
  const offset = digest[digest.length - 1] & 0x0f
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)

  return (code % 10 ** DIGITS).toString().padStart(DIGITS, '0')
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/**
 * Verify a 6-digit TOTP code against a base32 secret.
 * @param base32Secret base32-encoded secret
 * @param code user-supplied 6-digit code
 * @param windowSteps allowed clock drift in steps (±1 by default)
 * @param atTime verification instant (default: now) — injectable for tests
 */
export function verifyTotp(
  base32Secret: string,
  code: string,
  windowSteps = 1,
  atTime: number = Date.now()
): boolean {
  if (!/^\d{6}$/.test(code)) return false
  const secret = base32Decode(base32Secret)
  if (secret.length === 0) return false

  const currentStep = Math.floor(atTime / 1000 / STEP_SECONDS)
  for (let drift = -windowSteps; drift <= windowSteps; drift++) {
    const candidate = hotp(secret, currentStep + drift)
    if (safeEqual(candidate, code)) return true
  }
  return false
}

// ──────────────────────────────────────────────────────────────
// Backup codes (hashed storage)
// ──────────────────────────────────────────────────────────────

/** SHA-256 hash a backup code for at-rest storage (codes verified once). */
export function hashBackupCode(code: string): string {
  return createHash('sha256').update(code.trim().toUpperCase()).digest('hex')
}

/** Constant-time backup code verification against a set of hashes. */
export function verifyBackupCode(code: string, hashes: string[]): boolean {
  const candidate = Buffer.from(hashBackupCode(code))
  return hashes.some((h) => {
    const stored = Buffer.from(h)
    return stored.length === candidate.length && timingSafeEqual(stored, candidate)
  })
}

// ──────────────────────────────────────────────────────────────
// otpauth URI (scannable by authenticator apps)
// ──────────────────────────────────────────────────────────────

export function buildOtpauthUrl(issuer: string, accountName: string, secret: string): string {
  return (
    `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}` +
    `?secret=${secret}&issuer=${encodeURIComponent(issuer)}` +
    `&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`
  )
}
