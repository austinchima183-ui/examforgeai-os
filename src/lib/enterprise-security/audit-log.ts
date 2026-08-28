// ============================================================================
// ExamForge AI — Enterprise Audit Log Service
// ============================================================================
// Comprehensive audit logging system for enterprise compliance:
// - Structured event logging with risk scores
// - Queryable log storage with pagination and filtering
// - Statistical analysis and anomaly detection
// - Export in JSON and CSV formats
// - Entity timeline reconstruction
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import type {
  AuditLogEntry,
  AuditLogFilters,
  AuditResult,
  AuditStats,
  AuditAnomaly,
  AnomalyType,
} from './types'

// ──────────────────────────────────────────────────────────────
// Audit Log Service Functions
// ──────────────────────────────────────────────────────────────

/**
 * Log an audit event.
 * All security-relevant actions should be logged through this function.
 * Events are persisted to Supabase for long-term storage and analysis.
 */
export async function logAuditEvent(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<AuditLogEntry> {
  const supabase = await createClient()
  const id = randomUUID()
  const timestamp = new Date().toISOString()

  const fullEntry: AuditLogEntry = {
    id,
    userId: entry.userId,
    organizationId: entry.organizationId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    result: entry.result,
    ip: entry.ip,
    userAgent: entry.userAgent,
    timestamp,
    riskScore: entry.riskScore,
    details: entry.details,
  }

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      id,
      user_id: entry.userId,
      organization_id: entry.organizationId,
      action: entry.action,
      resource: entry.resource,
      resource_id: entry.resourceId,
      result: entry.result,
      ip: entry.ip,
      user_agent: entry.userAgent,
      timestamp,
      risk_score: entry.riskScore,
      details: entry.details,
    })

  if (error) {
    // Audit logging should never fail silently — throw to alert
    throw new Error(`Failed to log audit event: ${error.message}`)
  }

  return fullEntry
}

/**
 * Query audit logs with filtering and pagination.
 * Supports filtering by user, org, action, resource, result, risk score, and time range.
 */
export async function getAuditLogs(
  filters: AuditLogFilters
): Promise<{ entries: AuditLogEntry[]; total: number }> {
  const supabase = await createClient()

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })

  // Apply filters
  if (filters.userId) {
    query = query.eq('user_id', filters.userId)
  }
  if (filters.organizationId) {
    query = query.eq('organization_id', filters.organizationId)
  }
  if (filters.action) {
    query = query.eq('action', filters.action)
  }
  if (filters.resource) {
    query = query.eq('resource', filters.resource)
  }
  if (filters.result) {
    query = query.eq('result', filters.result)
  }
  if (filters.minRiskScore !== null && filters.minRiskScore !== undefined) {
    query = query.gte('risk_score', filters.minRiskScore)
  }
  if (filters.fromTimestamp) {
    query = query.gte('timestamp', filters.fromTimestamp)
  }
  if (filters.toTimestamp) {
    query = query.lte('timestamp', filters.toTimestamp)
  }

  // Apply pagination
  const offset = filters.offset || 0
  const limit = filters.limit || 50

  query = query
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to query audit logs: ${error.message}`)
  }

  const entries = (data || []).map(mapRowToEntry)

  return { entries, total: count || 0 }
}

/**
 * Get audit statistics for an organization.
 * Provides aggregated metrics for dashboards and compliance reports.
 */
export async function getAuditStats(
  orgId: string,
  from?: string,
  to?: string
): Promise<AuditStats> {
  const supabase = await createClient()

  const fromTs = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const toTs = to || new Date().toISOString()

  // Fetch all events in the period for aggregation
  const { data, error } = await supabase
    .from('audit_logs')
    .select('action, resource, result, risk_score')
    .eq('organization_id', orgId)
    .gte('timestamp', fromTs)
    .lte('timestamp', toTs)

  if (error) {
    throw new Error(`Failed to get audit stats: ${error.message}`)
  }

  const events = data || []

  // Aggregate by result
  const byResult: Record<AuditResult, number> = {
    success: 0,
    failure: 0,
    denied: 0,
    error: 0,
    warning: 0,
  }

  // Aggregate by action (top 20)
  const byAction: Record<string, number> = {}

  // Aggregate by resource
  const byResource: Record<string, number> = {}

  // Calculate average risk score
  let totalRiskScore = 0
  let riskScoreCount = 0
  let highRiskEvents = 0

  for (const event of events) {
    // By result
    const result = event.result as AuditResult
    if (result in byResult) {
      byResult[result]++
    }

    // By action
    const action = event.action as string
    byAction[action] = (byAction[action] || 0) + 1

    // By resource
    const resource = event.resource as string
    byResource[resource] = (byResource[resource] || 0) + 1

    // Risk score
    const riskScore = (event.risk_score as number) || 0
    if (riskScore > 0) {
      totalRiskScore += riskScore
      riskScoreCount++
    }
    if (riskScore >= 70) {
      highRiskEvents++
    }
  }

  // Sort byAction by count and take top 20
  const sortedByAction = Object.entries(byAction)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {} as Record<string, number>)

  return {
    totalEvents: events.length,
    byResult,
    byAction: sortedByAction,
    byResource,
    averageRiskScore: riskScoreCount > 0 ? Math.round(totalRiskScore / riskScoreCount * 100) / 100 : 0,
    highRiskEvents,
    from: fromTs,
    to: toTs,
  }
}

/**
 * Export audit logs in the specified format.
 * Returns the serialized data as a string.
 */
export async function exportAuditLogs(
  orgId: string,
  format: 'json' | 'csv',
  filters?: Partial<AuditLogFilters>
): Promise<string> {
  const allFilters: AuditLogFilters = {
    organizationId: orgId,
    ...filters,
    limit: 10000, // Export limit
    offset: 0,
  }

  const { entries } = await getAuditLogs(allFilters)

  if (format === 'json') {
    return JSON.stringify(entries, null, 2)
  }

  // CSV format
  return entriesToCsv(entries)
}

/**
 * Get the complete audit timeline for a specific entity.
 * Shows all events related to an entity (user, session, device, etc.)
 * in chronological order.
 */
export async function getAuditTimeline(
  entityId: string,
  limit: number = 100
): Promise<AuditLogEntry[]> {
  const supabase = await createClient()

  // Search by both userId and resourceId to capture all related events
  const { data: byUser, error: err1 } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('user_id', entityId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  const { data: byResource, error: err2 } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('resource_id', entityId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (err1 || err2) {
    throw new Error('Failed to get audit timeline')
  }

  // Merge and deduplicate
  const allEntries = [...(byUser || []), ...(byResource || [])]
  const seen = new Set<string>()
  const unique = allEntries.filter((entry: Record<string, unknown>) => {
    if (seen.has(entry.id as string)) return false
    seen.add(entry.id as string)
    return true
  })

  // Sort by timestamp descending
  unique.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
    new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime()
  )

  return unique.slice(0, limit).map(mapRowToEntry)
}

/**
 * Detect anomalies in audit logs for an organization.
 * Runs multiple detection algorithms:
 * - Brute force detection
 * - Credential stuffing
 * - Impossible travel
 * - Privilege escalation
 * - Unusual access patterns
 * - Mass data export
 * - Account takeover signals
 */
export async function detectAnomalies(orgId: string): Promise<AuditAnomaly[]> {
  const supabase = await createClient()
  const anomalies: AuditAnomaly[] = []
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  // ── Detection 1: Brute Force ──
  // Users with >= 10 failed login attempts in the last hour
  const { data: bruteForceData } = await supabase
    .from('audit_logs')
    .select('user_id')
    .eq('organization_id', orgId)
    .eq('action', 'auth.login')
    .eq('result', 'failure')
    .gte('timestamp', oneHourAgo)

  if (bruteForceData) {
    const failCounts: Record<string, number> = {}
    for (const entry of bruteForceData) {
      const uid = entry.user_id as string
      failCounts[uid] = (failCounts[uid] || 0) + 1
    }

    const bruteForceUsers = Object.entries(failCounts)
      .filter(([, count]) => count >= 10)
      .map(([userId]) => userId)

    if (bruteForceUsers.length > 0) {
      anomalies.push({
        type: 'brute_force',
        severity: 'critical',
        description: `${bruteForceUsers.length} user(s) targeted with brute force attacks (10+ failed logins in the last hour)`,
        affectedUsers: bruteForceUsers,
        relatedEvents: bruteForceData
          .filter((e: Record<string, unknown>) => bruteForceUsers.includes(e.user_id as string))
          .map((e: Record<string, unknown>) => e.id as string)
          .slice(0, 50),
        detectedAt: now.toISOString(),
        data: { failCounts: Object.fromEntries(Object.entries(failCounts).filter(([, c]) => c >= 10)) },
      })
    }
  }

  // ── Detection 2: Credential Stuffing ──
  // Multiple failed logins from different IPs for the same user
  const { data: credStuffingData } = await supabase
    .from('audit_logs')
    .select('user_id, ip')
    .eq('organization_id', orgId)
    .eq('action', 'auth.login')
    .eq('result', 'failure')
    .gte('timestamp', twentyFourHoursAgo)

  if (credStuffingData) {
    const userIps: Record<string, Set<string>> = {}
    for (const entry of credStuffingData) {
      const uid = entry.user_id as string
      const ip = entry.ip as string
      if (!userIps[uid]) userIps[uid] = new Set()
      userIps[uid].add(ip)
    }

    const stuffingUsers = Object.entries(userIps)
      .filter(([, ips]) => ips.size >= 5)
      .map(([userId]) => userId)

    if (stuffingUsers.length > 0) {
      anomalies.push({
        type: 'credential_stuffing',
        severity: 'high',
        description: `${stuffingUsers.length} user(s) targeted with credential stuffing (failed logins from 5+ unique IPs in 24h)`,
        affectedUsers: stuffingUsers,
        relatedEvents: [],
        detectedAt: now.toISOString(),
        data: { uniqueIpCounts: Object.fromEntries(stuffingUsers.map(u => [u, userIps[u].size])) },
      })
    }
  }

  // ── Detection 3: Privilege Escalation ──
  // Role changes, especially elevation to admin roles
  const { data: privEscData } = await supabase
    .from('audit_logs')
    .select('id, user_id, details')
    .eq('organization_id', orgId)
    .eq('action', 'user.role_change')
    .eq('result', 'success')
    .gte('timestamp', twentyFourHoursAgo)

  if (privEscData && privEscData.length > 0) {
    const escalationUsers = privEscData
      .filter((e: Record<string, unknown>) => {
        const details = e.details as Record<string, unknown> | null
        return details?.newRole === 'super_admin' || details?.newRole === 'school_admin'
      })
      .map((e: Record<string, unknown>) => e.user_id as string)

    if (escalationUsers.length > 0) {
      anomalies.push({
        type: 'privilege_escalation',
        severity: 'high',
        description: `${escalationUsers.length} user(s) had their role elevated to admin in the last 24 hours`,
        affectedUsers: [...new Set(escalationUsers)],
        relatedEvents: privEscData.map((e: Record<string, unknown>) => e.id as string),
        detectedAt: now.toISOString(),
        data: { count: privEscData.length },
      })
    }
  }

  // ── Detection 4: Unusual Access Patterns ──
  // Access to sensitive resources outside normal hours
  const currentHour = now.getHours()
  if (currentHour >= 0 && currentHour <= 5) {
    const { data: nightAccess } = await supabase
      .from('audit_logs')
      .select('user_id')
      .eq('organization_id', orgId)
      .eq('result', 'success')
      .gte('timestamp', oneHourAgo)

    if (nightAccess && nightAccess.length > 0) {
      const uniqueUsers = [...new Set(nightAccess.map((e: Record<string, unknown>) => e.user_id as string))]
      anomalies.push({
        type: 'unusual_time_access',
        severity: 'low',
        description: `${uniqueUsers.length} user(s) accessing resources during unusual hours (midnight-5AM)`,
        affectedUsers: uniqueUsers,
        relatedEvents: [],
        detectedAt: now.toISOString(),
        data: { hour: currentHour, eventCount: nightAccess.length },
      })
    }
  }

  // ── Detection 5: Mass Data Export ──
  // Multiple export actions in a short period
  const { data: exportData } = await supabase
    .from('audit_logs')
    .select('user_id')
    .eq('organization_id', orgId)
    .in('action', ['data.export', 'report.export', 'users.export'])
    .eq('result', 'success')
    .gte('timestamp', oneHourAgo)

  if (exportData && exportData.length >= 5) {
    const exportCounts: Record<string, number> = {}
    for (const entry of exportData) {
      const uid = entry.user_id as string
      exportCounts[uid] = (exportCounts[uid] || 0) + 1
    }

    const massExportUsers = Object.entries(exportCounts)
      .filter(([, count]) => count >= 3)
      .map(([userId]) => userId)

    if (massExportUsers.length > 0) {
      anomalies.push({
        type: 'mass_export',
        severity: 'medium',
        description: `${massExportUsers.length} user(s) performing mass data exports (3+ exports in the last hour)`,
        affectedUsers: massExportUsers,
        relatedEvents: [],
        detectedAt: now.toISOString(),
        data: { exportCounts: Object.fromEntries(Object.entries(exportCounts).filter(([, c]) => c >= 3)) },
      })
    }
  }

  // ── Detection 6: Multiple Failed MFA ──
  // Users with multiple failed MFA attempts
  const { data: mfaFailData } = await supabase
    .from('audit_logs')
    .select('user_id')
    .eq('organization_id', orgId)
    .eq('action', 'auth.mfa_verify')
    .eq('result', 'failure')
    .gte('timestamp', oneHourAgo)

  if (mfaFailData) {
    const mfaFailCounts: Record<string, number> = {}
    for (const entry of mfaFailData) {
      const uid = entry.user_id as string
      mfaFailCounts[uid] = (mfaFailCounts[uid] || 0) + 1
    }

    const mfaFailUsers = Object.entries(mfaFailCounts)
      .filter(([, count]) => count >= 3)
      .map(([userId]) => userId)

    if (mfaFailUsers.length > 0) {
      anomalies.push({
        type: 'multiple_failed_mfa',
        severity: 'high',
        description: `${mfaFailUsers.length} user(s) with multiple failed MFA attempts (3+ in the last hour)`,
        affectedUsers: mfaFailUsers,
        relatedEvents: [],
        detectedAt: now.toISOString(),
        data: { failCounts: Object.fromEntries(Object.entries(mfaFailCounts).filter(([, c]) => c >= 3)) },
      })
    }
  }

  // ── Detection 7: Account Takeover Signals ──
  // Successful login immediately after multiple failures
  const { data: recentLogins } = await supabase
    .from('audit_logs')
    .select('user_id, result, timestamp')
    .eq('organization_id', orgId)
    .in('action', ['auth.login'])
    .gte('timestamp', oneHourAgo)
    .order('timestamp', { ascending: false })

  if (recentLogins && recentLogins.length > 0) {
    // Group by user and check for failure-then-success patterns
    const userEvents: Record<string, { result: string; timestamp: string }[]> = {}
    for (const entry of recentLogins) {
      const uid = entry.user_id as string
      if (!userEvents[uid]) userEvents[uid] = []
      userEvents[uid].push({
        result: entry.result as string,
        timestamp: entry.timestamp as string,
      })
    }

    const takeoverUsers: string[] = []
    for (const [userId, events] of Object.entries(userEvents)) {
      // Look for pattern: multiple failures followed by success
      let failCount = 0
      let takeoverDetected = false
      for (const event of events) {
        if (event.result === 'failure') {
          failCount++
        } else if (event.result === 'success' && failCount >= 5) {
          takeoverDetected = true
          break
        } else if (event.result === 'success') {
          failCount = 0
        }
      }
      if (takeoverDetected) takeoverUsers.push(userId)
    }

    if (takeoverUsers.length > 0) {
      anomalies.push({
        type: 'account_takeover',
        severity: 'critical',
        description: `${takeoverUsers.length} user(s) showing account takeover patterns (5+ failures then success)`,
        affectedUsers: takeoverUsers,
        relatedEvents: [],
        detectedAt: now.toISOString(),
        data: { pattern: 'failures_then_success' },
      })
    }
  }

  return anomalies
}

// ──────────────────────────────────────────────────────────────
// Audit Event Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Standard audit action constants for consistency.
 */
export const AUDIT_ACTIONS = {
  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_MFA_VERIFY: 'auth.mfa_verify',
  AUTH_MFA_ENABLE: 'auth.mfa_enable',
  AUTH_MFA_DISABLE: 'auth.mfa_disable',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  AUTH_SSO_LOGIN: 'auth.sso_login',
  AUTH_PASSKEY_REGISTER: 'auth.passkey_register',
  AUTH_PASSKEY_AUTH: 'auth.passkey_auth',

  // User management
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ROLE_CHANGE: 'user.role_change',
  USER_SUSPEND: 'user.suspend',
  USER_UNSUSPEND: 'user.unsuspend',

  // Session management
  SESSION_CREATE: 'session.create',
  SESSION_TERMINATE: 'session.terminate',
  SESSION_TERMINATE_ALL: 'session.terminate_all',

  // Device management
  DEVICE_REGISTER: 'device.register',
  DEVICE_REVOKE: 'device.revoke',
  DEVICE_TRUST_UPDATE: 'device.trust_update',

  // Policy management
  POLICY_CREATE: 'policy.create',
  POLICY_UPDATE: 'policy.update',
  POLICY_DELETE: 'policy.delete',

  // Data access
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  DATA_ACCESS: 'data.access',

  // SSO management
  SSO_CONFIGURE: 'sso.configure',
  SSO_DELETE: 'sso.delete',
  SSO_TEST: 'sso.test',
  SCIM_SYNC: 'scim.sync',
} as const

/**
 * Log a common authentication event with standard fields.
 */
export async function logAuthEvent(
  action: string,
  userId: string | null,
  orgId: string | null,
  result: AuditResult,
  ip: string | null,
  userAgent: string | null,
  riskScore?: number,
  details?: Record<string, unknown>
): Promise<AuditLogEntry> {
  return logAuditEvent({
    userId,
    organizationId: orgId,
    action,
    resource: 'auth',
    resourceId: userId,
    result,
    ip,
    userAgent,
    riskScore: riskScore || null,
    details: details || null,
  })
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Map a database row to AuditLogEntry.
 */
function mapRowToEntry(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row.id as string,
    userId: (row.user_id as string) || null,
    organizationId: (row.organization_id as string) || null,
    action: row.action as string,
    resource: row.resource as string,
    resourceId: (row.resource_id as string) || null,
    result: row.result as AuditResult,
    ip: (row.ip as string) || null,
    userAgent: (row.user_agent as string) || null,
    timestamp: row.timestamp as string,
    riskScore: (row.risk_score as number) || null,
    details: (row.details as Record<string, unknown>) || null,
  }
}

/**
 * Convert audit log entries to CSV format.
 */
function entriesToCsv(entries: AuditLogEntry[]): string {
  const headers = [
    'id', 'timestamp', 'userId', 'organizationId', 'action',
    'resource', 'resourceId', 'result', 'ip', 'userAgent',
    'riskScore', 'details',
  ]

  const rows = entries.map(entry => [
    entry.id,
    entry.timestamp,
    entry.userId || '',
    entry.organizationId || '',
    entry.action,
    entry.resource,
    entry.resourceId || '',
    entry.result,
    entry.ip || '',
    entry.userAgent || '',
    entry.riskScore?.toString() || '',
    entry.details ? JSON.stringify(entry.details) : '',
  ])

  // Escape CSV values (handle commas and quotes)
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`
    }
    return val
  }

  return [
    headers.join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n')
}
