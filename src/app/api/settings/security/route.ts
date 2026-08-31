import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { getAuthUser } from '@/lib/auth/require-auth'
import {
  generateTotpSecret,
  generateBackupCodes,
  verifyTotp,
  verifyBackupCode,
  hashBackupCode,
  buildOtpauthUrl,
} from '@/lib/security/totp'

// ============================================================================
// ExamForge AI — Security Settings API (REAL 2FA)
// ============================================================================
// 2FA setup/verification, session management, login history, password policy.
//
// SECURITY MODEL (Ω-18 hardening):
//   • Identity: Supabase session via getAuthUser() — NEVER a client-supplied
//     header (the old x-user-id trust was a P0 identity-spoofing hole).
//   • TOTP: RFC 6238 verification against the secret stored (hashed backup
//     codes) in users.settings.two_factor — the old "any 6 digits passes"
//     fake is gone.
//   • Session revocation: ownership-scoped (user_id filter) — closes the
//     revoke-any-session IDOR.
//   • Verification attempts: in-memory sliding-window limiter per user
//     (brute-force protection; 5 attempts / 15 min).
//   • All security actions are written to audit_logs.
// ============================================================================

interface TwoFactorSettings {
  enabled: boolean
  secret: string
  backupCodes: string[] // SHA-256 hashes
  verifiedAt: string | null
  lastUsedAt: string | null
}

// ── In-memory verification attempt limiter (per user, sliding window) ──
const VERIFY_WINDOW_MS = 15 * 60 * 1000
const VERIFY_MAX_ATTEMPTS = 5
const verifyAttempts = new Map<string, number[]>()

function tooManyVerifyAttempts(userId: string): boolean {
  const now = Date.now()
  const attempts = (verifyAttempts.get(userId) ?? []).filter((t) => now - t < VERIFY_WINDOW_MS)
  const blocked = attempts.length >= VERIFY_MAX_ATTEMPTS
  if (!blocked) {
    attempts.push(now)
  }
  verifyAttempts.set(userId, attempts)
  // Opportunistic cleanup
  if (verifyAttempts.size > 5000) {
    for (const [k, v] of verifyAttempts) {
      if (v.every((t) => now - t >= VERIFY_WINDOW_MS)) verifyAttempts.delete(k)
    }
  }
  return blocked
}

function clearVerifyAttempts(userId: string): void {
  verifyAttempts.delete(userId)
}

async function getSupabaseClient() {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    return await createClient()
  } catch {
    return null
  }
}

async function readTwoFactorSettings(
  sb: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>,
  userId: string
): Promise<TwoFactorSettings | null> {
  const { data } = await sb.from('users').select('settings').eq('id', userId).single()
  const raw = (data?.settings as Record<string, unknown> | null)?.two_factor
  if (!raw || typeof raw !== 'object') return null
  const tf = raw as Partial<TwoFactorSettings>
  return {
    enabled: Boolean(tf.enabled),
    secret: typeof tf.secret === 'string' ? tf.secret : '',
    backupCodes: Array.isArray(tf.backupCodes) ? (tf.backupCodes as string[]) : [],
    verifiedAt: typeof tf.verifiedAt === 'string' ? tf.verifiedAt : null,
    lastUsedAt: typeof tf.lastUsedAt === 'string' ? tf.lastUsedAt : null,
  }
}

async function writeTwoFactorSettings(
  sb: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>>,
  userId: string,
  tf: TwoFactorSettings | null
): Promise<boolean> {
  // Read-modify-write on the JSONB settings column (atomicity acceptable for
  // single-user settings; RLS scopes writes to the owner's row).
  const { data } = await sb.from('users').select('settings').eq('id', userId).single()
  const settings = (data?.settings as Record<string, unknown> | null) ?? {}
  if (tf) {
    settings.two_factor = tf
  } else {
    delete settings.two_factor
  }
  const { error } = await sb.from('users').update({ settings }).eq('id', userId)
  return !error
}

async function writeAudit(
  sb: NonNullable<Awaited<ReturnType<typeof getSupabaseClient>>> | null,
  userId: string,
  action: string,
  result: string,
  details?: Record<string, unknown>
): Promise<void> {
  if (!sb) return
  try {
    await sb.from('audit_logs').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      action,
      resource: 'security_settings',
      result,
      details: details ?? {},
      created_at: new Date().toISOString(),
    })
  } catch {
    // Audit logging must never break the security operation
  }
}

// GET /api/settings/security
export async function GET(_request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = auth.user.id

    const sb = await getSupabaseClient()

    let twoFactorEnabled = false
    let sessions: unknown[] = []
    let loginHistory: unknown[] = []
    let passwordPolicy: Record<string, unknown> | null = null

    if (sb) {
      const tf = await readTwoFactorSettings(sb, userId)
      twoFactorEnabled = tf?.enabled ?? false

      // Sessions (RLS-scoped to the owner; never trust a header for identity)
      try {
        const sessionsResult = await sb
          .from('sessions')
          .select('*')
          .eq('user_id', userId)
          .order('last_active', { ascending: false })
        if (sessionsResult.data) {
          sessions = sessionsResult.data.map((row: Record<string, unknown>) => ({
            id: row.id,
            device: row.device ?? 'Unknown Device',
            browser: row.browser ?? 'Unknown Browser',
            ip: row.ip_address ?? 'Unknown',
            location: row.location ?? 'Unknown',
            lastActive: row.last_active ?? new Date().toISOString(),
            current: false, // resolved client-side by recency marker below
          }))
          if (sessions.length > 0) {
            ;(sessions[0] as Record<string, unknown>).current = true
          }
        }
      } catch {
        // Sessions query failed — degraded, not fatal
      }

      // Login history (audit trail, owner-scoped)
      try {
        const auditResult = await sb
          .from('audit_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('action', 'login')
          .order('created_at', { ascending: false })
          .limit(20)
        if (auditResult.data) {
          loginHistory = auditResult.data.map((row: Record<string, unknown>) => ({
            id: row.id,
            ip: row.ip_address ?? 'Unknown',
            device: row.device ?? 'Unknown',
            timestamp: row.created_at,
            success: row.success ?? true,
          }))
        }
      } catch {
        // Audit query failed — degraded, not fatal
      }

      // Password policy (organization_settings when the table exists)
      try {
        const orgResult = await sb
          .from('organization_settings')
          .select('password_policy')
          .limit(1)
          .single()
        if (orgResult.data?.password_policy) {
          passwordPolicy = orgResult.data.password_policy as Record<string, unknown>
        }
      } catch {
        // Org settings table not present — default policy applies
      }
    }

    return NextResponse.json({
      twoFactorEnabled,
      totpVerified: twoFactorEnabled,
      backupCodes: [],
      sessions,
      loginHistory,
      passwordPolicy: passwordPolicy ?? {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expiryDays: 90,
      },
    })
  } catch (error) {
    console.error('Error fetching security settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/settings/security
export async function POST(request: NextRequest) {
  try {
    // ── Rate limit (strict — security-sensitive endpoint) ──
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.strict)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        { status: 429 }
      )
    }

    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = auth.user.id

    // ─── CSRF guard (session-bound) ───
    const csrfResult = enforceCsrf(request, { user: { id: userId } })
    if (csrfResult) return csrfResult

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const securityActionSchema = z
      .object({
        action: z.enum([
          'setup_2fa',
          'verify_2fa',
          'disable_2fa',
          'revoke_session',
          'revoke_all_sessions',
        ]),
        code: z.string().optional(),
        backupCode: z.string().optional(),
        sessionId: z.string().uuid().optional(),
      })
      .passthrough()
    const { validateInput } = await import('@/lib/api/validate')
    const input = validateInput(securityActionSchema, rawBody)
    if ('error' in input) return input.error
    const body = input.data as {
      action: string
      code?: string
      backupCode?: string
      sessionId?: string
    }
    const { action } = body

    const sb = await getSupabaseClient()

    switch (action) {
      // ── Setup: generate secret + backup codes, persist PENDING state ──
      case 'setup_2fa': {
        if (!sb) {
          return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
        }
        const secret = generateTotpSecret()
        const backupCodes = generateBackupCodes()
        const pending: TwoFactorSettings = {
          enabled: false,
          secret,
          backupCodes: backupCodes.map(hashBackupCode),
          verifiedAt: null,
          lastUsedAt: null,
        }
        const saved = await writeTwoFactorSettings(sb, userId, pending)
        if (!saved) {
          return NextResponse.json({ error: 'Failed to persist 2FA setup' }, { status: 500 })
        }
        await writeAudit(sb, userId, '2fa_setup_started', 'success')
        const otpauthUrl = buildOtpauthUrl('ExamForge AI', auth.user.email, secret)
        return NextResponse.json({ secret, backupCodes, otpauthUrl })
      }

      // ── Verify: REAL RFC 6238 TOTP check against the stored secret ──
      case 'verify_2fa': {
        if (!sb) {
          return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
        }
        if (tooManyVerifyAttempts(userId)) {
          await writeAudit(sb, userId, '2fa_verify_rate_limited', 'blocked')
          return NextResponse.json(
            { error: 'Too many verification attempts — try again later' },
            { status: 429 }
          )
        }

        const tf = await readTwoFactorSettings(sb, userId)
        if (!tf || !tf.secret) {
          return NextResponse.json(
            { verified: false, error: 'No pending 2FA setup — start setup first' },
            { status: 400 }
          )
        }

        // Primary: TOTP code; fallback: single-use backup code (first verify)
        const codeOk = body.code ? verifyTotp(tf.secret, body.code) : false
        const backupOk =
          !codeOk && body.backupCode ? verifyBackupCode(body.backupCode, tf.backupCodes) : false

        if (codeOk || backupOk) {
          const enabled: TwoFactorSettings = {
            ...tf,
            enabled: true,
            verifiedAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            // When a backup code was consumed, remove it (single-use)
            backupCodes: backupOk
              ? tf.backupCodes.filter((h) => h !== hashBackupCode(body.backupCode!))
              : tf.backupCodes,
          }
          const saved = await writeTwoFactorSettings(sb, userId, enabled)
          if (!saved) {
            return NextResponse.json({ error: 'Failed to enable 2FA' }, { status: 500 })
          }
          clearVerifyAttempts(userId)
          await writeAudit(sb, userId, '2fa_enabled', 'success', {
            method: codeOk ? 'totp' : 'backup_code',
          })
          return NextResponse.json({ verified: true })
        }

        await writeAudit(sb, userId, '2fa_verify_failed', 'failure')
        return NextResponse.json({ verified: false, error: 'Invalid code' }, { status: 400 })
      }

      // ── Disable: requires a valid TOTP code (anti-takeover) ──
      case 'disable_2fa': {
        if (!sb) {
          return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
        }
        if (tooManyVerifyAttempts(userId)) {
          return NextResponse.json(
            { error: 'Too many attempts — try again later' },
            { status: 429 }
          )
        }
        const tf = await readTwoFactorSettings(sb, userId)
        if (!tf || !tf.enabled) {
          return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
        }
        const codeOk = body.code ? verifyTotp(tf.secret, body.code) : false
        const backupOk =
          !codeOk && body.backupCode ? verifyBackupCode(body.backupCode, tf.backupCodes) : false
        if (!codeOk && !backupOk) {
          await writeAudit(sb, userId, '2fa_disable_failed', 'failure')
          return NextResponse.json(
            { disabled: false, error: 'Valid code required to disable 2FA' },
            { status: 403 }
          )
        }
        const removed = await writeTwoFactorSettings(sb, userId, null)
        if (!removed) {
          return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
        }
        clearVerifyAttempts(userId)
        await writeAudit(sb, userId, '2fa_disabled', 'success', {
          method: codeOk ? 'totp' : 'backup_code',
        })
        return NextResponse.json({ disabled: true })
      }

      // ── Revoke one session: ownership-scoped (closes IDOR) ──
      case 'revoke_session': {
        if (!sb) {
          return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
        }
        const { sessionId } = body
        if (!sessionId) {
          return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })
        }
        // user_id filter = ownership proof; deleting another user's session
        // simply matches zero rows.
        const { error, count } = await sb
          .from('sessions')
          .delete({ count: 'exact' })
          .eq('id', sessionId)
          .eq('user_id', userId)
        if (error) {
          return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 })
        }
        if (count === 0) {
          return NextResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          )
        }
        await writeAudit(sb, userId, 'session_revoked', 'success', { sessionId })
        return NextResponse.json({ revoked: true, sessionId })
      }

      // ── Revoke all other sessions: same ownership scope ──
      case 'revoke_all_sessions': {
        if (!sb) {
          return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
        }
        // Revoke every session of the OWNER except the most recent one
        // (treated as the current session — no spoofable header involved).
        const { data: rows } = await sb
          .from('sessions')
          .select('id, last_active')
          .eq('user_id', userId)
          .order('last_active', { ascending: false })
        if (rows && rows.length > 1) {
          const keepId = rows[0].id as string
          await sb
            .from('sessions')
            .delete()
            .eq('user_id', userId)
            .neq('id', keepId)
        }
        await writeAudit(sb, userId, 'all_sessions_revoked', 'success')
        return NextResponse.json({ revoked: true })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing security action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
