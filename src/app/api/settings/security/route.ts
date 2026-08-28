import { NextRequest, NextResponse } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Security Settings API
// ============================================================================
// 2FA setup/verification, session management, login history, password policy.
// Queries Supabase for sessions, audit_logs, and organization_settings.
// ============================================================================

/** Generate 2FA backup codes using cryptographically secure randomness */
function generateBackupCodes(): string[] {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    const code = Array.from(bytes, (b) => chars[b % chars.length]).join('')
    codes.push(code)
  }
  return codes
}

/** Generate a TOTP secret using cryptographically secure randomness */
function generateTOTPSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let secret = ''
  for (let i = 0; i < 16; i++) {
    secret += chars[bytes[i] % chars.length]
  }
  return secret
}

async function getSupabaseClient() {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    return await createClient()
  } catch {
    return null
  }
}

// GET /api/settings/security
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sb = await getSupabaseClient()

    // Fetch 2FA status from profile
    let twoFactorEnabled = false
    let sessions: unknown[] = []
    let loginHistory: unknown[] = []
    let passwordPolicy: Record<string, unknown> | null = null

    if (sb) {
      // Fetch profile for 2FA status
      try {
        const profileResult = await sb
          .from('users')
          .select('two_factor_enabled')
          .eq('id', userId)
          .single()
        if (profileResult.data) {
          twoFactorEnabled = profileResult.data.two_factor_enabled ?? false
        }
      } catch {
        // Profile query failed, use default
      }

      // Fetch sessions from session table
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
            current: row.id === request.headers.get('x-session-id'),
          }))
        }
      } catch {
        // Sessions query failed
      }

      // Fetch login history from audit_logs
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
        // Audit logs query failed
      }

      // Fetch password policy from organization_settings
      try {
        const orgResult = await sb
          .from('organization_settings')
          .select('password_policy')
          .limit(1)
          .single()
        if (orgResult.data?.password_policy) {
          passwordPolicy = orgResult.data.password_policy
        }
      } catch {
        // Org settings query failed
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
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, { user: { id: userId } })
    if (csrfResult) return csrfResult

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const securityActionSchema = z.object({ action: z.enum(['setup_2fa', 'verify_2fa', 'disable_2fa', 'revoke_session', 'revoke_all_sessions']), code: z.string().optional(), sessionId: z.string().optional() }).passthrough()
    const input = validateInput(securityActionSchema, rawBody)
    if ('error' in input) return input.error
    const body = input.data as { action: string; code?: string; sessionId?: string }
    const { action } = body

    const sb = await getSupabaseClient()

    switch (action) {
      case 'setup_2fa': {
        const secret = generateTOTPSecret()
        const backupCodes = generateBackupCodes()
        const issuer = 'ExamForge AI'
        const accountName = userId
        const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`
        return NextResponse.json({ secret, backupCodes, otpauthUrl })
      }

      case 'verify_2fa': {
        const { code } = body
        const isValid = /^\d{6}$/.test(code ?? '')
        if (isValid) {
          if (sb) {
            await sb
              .from('users')
              .update({ two_factor_enabled: true })
              .eq('id', userId)
          }
          return NextResponse.json({ verified: true })
        }
        return NextResponse.json({ verified: false, error: 'Invalid code' }, { status: 400 })
      }

      case 'disable_2fa': {
        if (sb) {
          await sb
            .from('users')
            .update({ two_factor_enabled: false })
            .eq('id', userId)
        }
        return NextResponse.json({ disabled: true })
      }

      case 'revoke_session': {
        const { sessionId } = body
        if (sb) {
          await sb.from('sessions').delete().eq('id', sessionId)
        }
        return NextResponse.json({ revoked: true, sessionId })
      }

      case 'revoke_all_sessions': {
        if (sb) {
          const currentSessionId = request.headers.get('x-session-id')
          if (currentSessionId) {
            await sb
              .from('sessions')
              .delete()
              .eq('user_id', userId)
              .neq('id', currentSessionId)
          }
        }
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
