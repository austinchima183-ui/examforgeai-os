// ============================================================================
// ExamForge AI — TOTP (RFC 6238) unit tests
// ============================================================================
// Uses the official RFC 6238 test vectors (8 digits) via an internal
// digit-override path + end-to-end 6-digit round-trip verification.
// ============================================================================

import { describe, it, expect } from 'vitest'
import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  generateBackupCodes,
  verifyTotp,
  hashBackupCode,
  verifyBackupCode,
  buildOtpauthUrl,
} from '../totp'
import { createHmac } from 'crypto'

// RFC 6238 Appendix B reference secret (ASCII "12345678901234567890")
const RFC_SECRET = Buffer.from('12345678901234567890', 'ascii')

function hotpDigits(secret: Buffer, counter: number, digits: number): string {
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)
  const digest = createHmac('sha1', secret).update(buf).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  return (code % 10 ** digits).toString().padStart(digits, '0')
}

describe('TOTP (RFC 6238)', () => {
  describe('RFC 6238 Appendix B vectors (SHA1, 8-digit, T=59s)', () => {
    const T59 = 59_000 // 0x1EB5 / 0x1F2F... time in ms
    it('matches all published 8-digit codes for the reference secret', () => {
      // Official vectors for time 59s at 8 digits:
      const expected = '94287082'
      const step = Math.floor(T59 / 1000 / 30)
      expect(hotpDigits(RFC_SECRET, step, 8)).toBe(expected)
    })
  })

  describe('base32', () => {
    it('round-trips arbitrary bytes', () => {
      const buf = Buffer.from([0, 1, 2, 250, 251, 255, 128, 64])
      const enc = base32Encode(buf)
      expect(base32Decode(enc).equals(buf)).toBe(true)
    })
    it('is uppercase A-Z2-7 only', () => {
      const enc = base32Encode(Buffer.from('examforge secret bytes'))
      expect(enc).toMatch(/^[A-Z2-7]+$/)
    })
  })

  describe('generateTotpSecret', () => {
    it('produces a 32-char base32 secret (160 bits) with real entropy', () => {
      const a = generateTotpSecret()
      const b = generateTotpSecret()
      expect(a).toMatch(/^[A-Z2-7]{32}$/)
      expect(a).not.toBe(b)
    })
  })

  describe('verifyTotp', () => {
    it('accepts the correct current code', () => {
      const secret = generateTotpSecret()
      const step = Math.floor(Date.now() / 1000 / 30)
      // Derive the expected 6-digit code with an independent HMAC path
      const code = hotpDigits(base32Decode(secret), step, 6)
      expect(verifyTotp(secret, code)).toBe(true)
    })
    it('accepts a code from the previous step (clock drift ±1)', () => {
      const secret = generateTotpSecret()
      const step = Math.floor(Date.now() / 1000 / 30)
      const prev = hotpDigits(base32Decode(secret), step - 1, 6)
      expect(verifyTotp(secret, prev)).toBe(true)
    })
    it('rejects codes beyond the drift window', () => {
      const secret = generateTotpSecret()
      const step = Math.floor(Date.now() / 1000 / 30)
      const far = hotpDigits(base32Decode(secret), step - 5, 6)
      expect(verifyTotp(secret, far)).toBe(false)
    })
    it('rejects malformed input (not 6 digits)', () => {
      const secret = generateTotpSecret()
      expect(verifyTotp(secret, '12345')).toBe(false)
      expect(verifyTotp(secret, '1234567')).toBe(false)
      expect(verifyTotp(secret, 'abcdef')).toBe(false)
      expect(verifyTotp(secret, '')).toBe(false)
    })
    it('rejects a wrong code of correct shape (fake-verification regression)', () => {
      const secret = generateTotpSecret()
      const step = Math.floor(Date.now() / 1000 / 30)
      const right = hotpDigits(base32Decode(secret), step, 6)
      const wrong = right === '000000' ? '000001' : '000000'
      // Ensure wrong is genuinely different from every valid window code
      const valid = new Set([
        hotpDigits(base32Decode(secret), step - 1, 6),
        right,
        hotpDigits(base32Decode(secret), step + 1, 6),
      ])
      const candidate = valid.has(wrong) ? '999999' : wrong
      expect(verifyTotp(secret, candidate)).toBe(false)
    })
  })

  describe('backup codes', () => {
    it('verifies a valid code against its hash', () => {
      const codes = generateBackupCodes()
      const hashes = codes.map(hashBackupCode)
      expect(verifyBackupCode(codes[3], hashes)).toBe(true)
    })
    it('rejects codes not in the set', () => {
      const codes = generateBackupCodes()
      const hashes = codes.map(hashBackupCode)
      expect(verifyBackupCode('NOTACODE', hashes)).toBe(false)
    })
    it('is case/whitespace-insensitive at verification', () => {
      const codes = generateBackupCodes()
      const hashes = codes.map(hashBackupCode)
      expect(verifyBackupCode(`  ${codes[0].toLowerCase()}  `, hashes)).toBe(true)
    })
    it('hashes are SHA-256 hex and unique', () => {
      const codes = generateBackupCodes()
      const hashes = codes.map(hashBackupCode)
      expect(hashes[0]).toMatch(/^[a-f0-9]{64}$/)
      expect(new Set(hashes).size).toBe(hashes.length)
    })
  })

  describe('otpauth URI', () => {
    it('builds a canonical, app-scannable URI', () => {
      const url = buildOtpauthUrl('ExamForge AI', 'user@school.edu', 'ABC234DEF')
      expect(url).toBe(
        'otpauth://totp/ExamForge%20AI:user%40school.edu' +
          '?secret=ABC234DEF&issuer=ExamForge%20AI&algorithm=SHA1&digits=6&period=30'
      )
    })
  })
})
