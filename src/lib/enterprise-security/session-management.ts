// ============================================================================
// ExamForge AI — Session Management Service
// ============================================================================
// Enterprise session management with:
// - Secure session creation and validation
// - Concurrent session limits
// - Session extension and timeout
// - Activity tracking
// - Bulk session termination (security events)
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import { createHmac } from 'crypto'
import type {
  SessionInfo,
  SessionActivityEntry,
  SessionActivityType,
} from './types'

// ──────────────────────────────────────────────────────────────
// Session Configuration
// ──────────────────────────────────────────────────────────────

const SESSION_CONFIG = {
  /** Default session duration (24 hours) */
  defaultDurationMs: 24 * 60 * 60 * 1000,
  /** Maximum session extension duration (30 days) */
  maxExtensionMs: 30 * 24 * 60 * 60 * 1000,
  /** Default maximum concurrent sessions per user */
  defaultMaxConcurrent: 5,
  /** Session inactivity timeout (30 minutes) */
  inactivityTimeoutMs: 30 * 60 * 1000,
  /** Secret for token hashing — FAIL FAST if not set in production */
  tokenSecret: (() => {
    const secret = process.env.SESSION_TOKEN_SECRET
    if (!secret) {
      if (process.env.NODE_ENV === 'production' || (process.env.NODE_ENV as string) === 'staging') {
        throw new Error(
          'SESSION_TOKEN_SECRET environment variable is required. ' +
          'Application refuses to start without it. Set a cryptographically random 32+ byte value.'
        )
      }
      // Dev: generate a random per-process secret (stable within process, not across restarts)
      const devBytes = new Uint8Array(32)
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(devBytes)
      }
      const devSecret = Buffer.from(devBytes).toString('hex')
      console.warn('[SECURITY] SESSION_TOKEN_SECRET not set — using random per-process dev secret. Set SESSION_TOKEN_SECRET env var.')
      return devSecret
    }
    return secret
  })(),
}

// ──────────────────────────────────────────────────────────────
// Session Service Functions
// ──────────────────────────────────────────────────────────────

/**
 * Create a new authenticated session.
 * Generates a secure session token (hashed), records device and IP info,
 * and enforces concurrent session limits.
 */
export async function createSession(
  userId: string,
  deviceId: string | null,
  ip: string,
  userAgent: string,
  mfaVerified: boolean = false,
  organizationId: string | null = null
): Promise<SessionInfo> {
  const supabase = await createClient()
  const id = randomUUID()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_CONFIG.defaultDurationMs)

  // Generate a secure session token and hash it for storage
  const sessionToken = generateSessionToken()
  const tokenHash = hashSessionToken(sessionToken)

  const session: SessionInfo = {
    id,
    userId,
    deviceId,
    createdAt: now.toISOString(),
    lastActiveAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ip,
    userAgent,
    isActive: true,
    mfaVerified,
    tokenHash,
    organizationId,
  }

  // Enforce concurrent session limit before creating new session
  await enforceConcurrentSessionLimit(userId, SESSION_CONFIG.defaultMaxConcurrent)

  // Persist the session
  const { error } = await supabase
    .from('sessions')
    .insert({
      id,
      user_id: userId,
      device_id: deviceId,
      created_at: session.createdAt,
      last_active_at: session.lastActiveAt,
      expires_at: session.expiresAt,
      ip,
      user_agent: userAgent,
      is_active: true,
      mfa_verified: mfaVerified,
      token_hash: tokenHash,
      organization_id: organizationId,
    })

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }

  // Log session creation activity
  await logSessionActivity(supabase, id, 'created', ip, userAgent, { deviceId, mfaVerified })

  return session
}

/**
 * Get a session by its ID.
 */
export async function getSession(sessionId: string): Promise<SessionInfo | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !data) return null

  return mapRowToSession(data)
}

/**
 * Validate a session and refresh its activity timestamp.
 * Returns the session if valid, null if expired/invalid.
 * Also checks for IP changes (possible session hijacking).
 */
export async function validateSession(
  sessionId: string,
  currentIp?: string
): Promise<{ session: SessionInfo | null; ipChanged: boolean; reason: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !data) {
    return { session: null, ipChanged: false, reason: 'Session not found' }
  }

  const session = mapRowToSession(data)

  // Check if session is active
  if (!session.isActive) {
    return { session: null, ipChanged: false, reason: 'Session is not active' }
  }

  // Check if session has expired
  if (new Date(session.expiresAt) < new Date()) {
    // Auto-terminate expired session
    await terminateSession(sessionId)
    return { session: null, ipChanged: false, reason: 'Session has expired' }
  }

  // Check inactivity timeout
  const lastActive = new Date(session.lastActiveAt)
  const inactivityMs = Date.now() - lastActive.getTime()
  if (inactivityMs > SESSION_CONFIG.inactivityTimeoutMs) {
    await terminateSession(sessionId)
    return { session: null, ipChanged: false, reason: 'Session timed out due to inactivity' }
  }

  // Detect IP change (possible session hijacking)
  let ipChanged = false
  if (currentIp && currentIp !== session.ip) {
    ipChanged = true
    await logSessionActivity(
      supabase, sessionId, 'ip_changed', currentIp, session.userAgent,
      { previousIp: session.ip, newIp: currentIp }
    )
  }

  // Update last active timestamp
  const now = new Date().toISOString()
  await supabase
    .from('sessions')
    .update({ last_active_at: now, ...(currentIp ? { ip: currentIp } : {}) })
    .eq('id', sessionId)

  session.lastActiveAt = now
  if (currentIp) session.ip = currentIp

  return { session, ipChanged, reason: null }
}

/**
 * Terminate a specific session.
 */
export async function terminateSession(sessionId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sessions')
    .update({
      is_active: false,
      terminated_at: new Date().toISOString(),
      termination_reason: 'manual',
    })
    .eq('id', sessionId)

  if (error) {
    throw new Error(`Failed to terminate session: ${error.message}`)
  }

  // Log termination
  const session = await getSession(sessionId)
  if (session) {
    await logSessionActivity(
      supabase, sessionId, 'terminated', session.ip, session.userAgent,
      { reason: 'manual' }
    )
  }

  return true
}

/**
 * Terminate all active sessions for a user.
 * Used during security events (password change, account lock, admin action).
 */
export async function terminateAllUserSessions(
  userId: string,
  exceptSessionId?: string
): Promise<number> {
  const supabase = await createClient()

  let query = supabase
    .from('sessions')
    .update({
      is_active: false,
      terminated_at: new Date().toISOString(),
      termination_reason: 'bulk_termination',
    })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (exceptSessionId) {
    query = query.neq('id', exceptSessionId)
  }

  const { data, error } = await query.select('id')

  if (error) {
    throw new Error(`Failed to terminate user sessions: ${error.message}`)
  }

  return data?.length || 0
}

/**
 * Get all active sessions for a user.
 * Useful for the security settings page ("Where you're logged in").
 */
export async function getActiveSessions(userId: string): Promise<SessionInfo[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('last_active_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get active sessions: ${error.message}`)
  }

  return (data || []).map(mapRowToSession)
}

/**
 * Extend a session's expiration time.
 * Subject to maximum extension limits.
 */
export async function extendSession(
  sessionId: string,
  extensionMs?: number
): Promise<SessionInfo> {
  const supabase = await createClient()

  const session = await getSession(sessionId)
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  if (!session.isActive) {
    throw new Error('Cannot extend an inactive session')
  }

  // Calculate new expiration (capped at max extension from now)
  const extension = Math.min(
    extensionMs || SESSION_CONFIG.defaultDurationMs,
    SESSION_CONFIG.maxExtensionMs
  )
  const newExpiresAt = new Date(Date.now() + extension)

  const { data, error } = await supabase
    .from('sessions')
    .update({
      expires_at: newExpiresAt.toISOString(),
      last_active_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to extend session: ${error.message}`)
  }

  // Log extension activity
  await logSessionActivity(
    supabase, sessionId, 'extended', session.ip, session.userAgent,
    { previousExpiry: session.expiresAt, newExpiry: newExpiresAt.toISOString() }
  )

  return mapRowToSession(data)
}

/**
 * Enforce the maximum concurrent session limit for a user.
 * Terminates the oldest sessions that exceed the limit.
 */
export async function enforceConcurrentSessionLimit(
  userId: string,
  maxSessions: number = SESSION_CONFIG.defaultMaxConcurrent
): Promise<number> {
  const supabase = await createClient()

  // Get active sessions ordered by creation time (oldest first)
  const { data: activeSessions, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error || !activeSessions) return 0

  // If under the limit, no action needed
  if (activeSessions.length < maxSessions) return 0

  // Terminate the oldest sessions that exceed the limit
  const sessionsToTerminate = activeSessions.slice(0, activeSessions.length - maxSessions + 1)
  const sessionIds = sessionsToTerminate.map((s: Record<string, unknown>) => s.id as string)

  if (sessionIds.length === 0) return 0

  const { error: terminateError } = await supabase
    .from('sessions')
    .update({
      is_active: false,
      terminated_at: new Date().toISOString(),
      termination_reason: 'concurrent_limit',
    })
    .in('id', sessionIds)

  if (terminateError) {
    console.error('Failed to enforce concurrent session limit:', terminateError)
    return 0
  }

  // Log enforcement
  for (const sessionId of sessionIds) {
    await logSessionActivity(
      supabase, sessionId, 'concurrent_limit_enforced', '', '',
      { maxSessions, terminatedCount: sessionIds.length }
    )
  }

  return sessionIds.length
}

/**
 * Get the session activity log for a user.
 * Shows all session events (create, extend, terminate, IP change, etc.).
 */
export async function getSessionActivityLog(
  userId: string,
  limit: number = 50
): Promise<SessionActivityEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('session_activity_log')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    sessionId: row.session_id as string,
    activity: row.activity as SessionActivityType,
    ip: (row.ip as string) || '',
    userAgent: (row.user_agent as string) || '',
    timestamp: row.timestamp as string,
    details: (row.details as Record<string, unknown>) || null,
  }))
}

/**
 * Mark a session as MFA-verified.
 * Called after successful MFA completion within an existing session.
 */
export async function markSessionMfaVerified(sessionId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sessions')
    .update({ mfa_verified: true })
    .eq('id', sessionId)

  if (error) {
    throw new Error(`Failed to mark session as MFA-verified: ${error.message}`)
  }

  const session = await getSession(sessionId)
  if (session) {
    await logSessionActivity(
      supabase, sessionId, 'mfa_verified', session.ip, session.userAgent, null
    )
  }
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure session token.
 */
function generateSessionToken(): string {
  const bytes = new Uint8Array(48)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  }
  return Buffer.from(bytes).toString('base64url')
}

/**
 * Hash a session token for storage.
 * We never store raw tokens — only SHA-256 hashes.
 */
function hashSessionToken(token: string): string {
  return createHmac('sha256', SESSION_CONFIG.tokenSecret)
    .update(token)
    .digest('hex')
}

/**
 * Log a session activity event.
 */
async function logSessionActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  activity: SessionActivityType,
  ip: string,
  userAgent: string,
  details: Record<string, unknown> | null
): Promise<void> {
  await supabase.from('session_activity_log').insert({
    id: randomUUID(),
    session_id: sessionId,
    activity,
    ip,
    user_agent: userAgent,
    timestamp: new Date().toISOString(),
    details,
  })
}

/**
 * Map a database row to SessionInfo.
 */
function mapRowToSession(row: Record<string, unknown>): SessionInfo {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    deviceId: (row.device_id as string) || null,
    createdAt: row.created_at as string,
    lastActiveAt: row.last_active_at as string,
    expiresAt: row.expires_at as string,
    ip: row.ip as string,
    userAgent: row.user_agent as string,
    isActive: row.is_active as boolean,
    mfaVerified: (row.mfa_verified as boolean) || false,
    tokenHash: (row.token_hash as string) || '',
    organizationId: (row.organization_id as string) || null,
  }
}
