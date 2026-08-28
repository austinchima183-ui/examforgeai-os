// ============================================================================
// ExamForge AI — Exam Tamper Detection
// ============================================================================
// Detects and logs tampering attempts during CBT examinations:
//   - Time drift between client and server clocks
//   - Duplicate submissions (double-submit prevention)
//   - Multiple concurrent tabs (via session token)
//   - Modified exam ID (client trying to access different exam)
//   - Modified student ID (identity spoofing)
//
// SECURITY PRINCIPLES:
//   1. All comparisons use server-authoritative data
//   2. Tamper events are logged immutably for audit
//   3. Severity is escalated based on pattern detection
//   4. Multiple low-severity events can trigger a high-severity flag
//
// SUPABASE UNIFICATION (2026-08-25):
//   Prisma/SQLite removed. Tamper events persist to the `tamper_events`
//   Supabase table via the service-role client (trusted server code).
// ============================================================================

import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/utils/logger'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

/** Result of checking time drift */
export interface TimeDriftResult {
  isDrifted: boolean
  driftSeconds: number
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
}

/** Result of checking for duplicate submission */
export interface DuplicateCheckResult {
  isDuplicate: boolean
  existingStatus?: string
  submittedAt?: string
}

/** Result of checking for multiple tabs */
export interface MultipleTabsCheckResult {
  isMultipleTabs: boolean
  currentTabToken?: string
  severity: 'none' | 'high'
}

/** Result of checking modified IDs */
export interface IdModificationCheckResult {
  isModified: boolean
  expected: string
  received: string
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

/** Maximum allowable clock skew in seconds before flagging */
const CLOCK_SKEW_TOLERANCE_SECONDS = 30

/** Severity thresholds for time drift (in seconds) */
const DRIFT_THRESHOLDS = {
  LOW: CLOCK_SKEW_TOLERANCE_SECONDS,     // > 30s
  MEDIUM: 60,                              // > 60s
  HIGH: 120,                               // > 120s (2 min)
  CRITICAL: 300,                           // > 300s (5 min)
} as const

// ──────────────────────────────────────────────────────────────
// 1. checkTimeDrift
// ──────────────────────────────────────────────────────────────

/**
 * Checks if the time drift between client and server exceeds tolerance.
 *
 * SECURITY: Server time is ALWAYS authoritative. The client's clock
 * can be manipulated, so we flag any drift > 30 seconds.
 *
 * @param clientTime - Client-reported timestamp (ISO string or epoch ms)
 * @param serverTime - Server-authoritative timestamp (ISO string or epoch ms)
 * @returns TimeDriftResult
 */
export function checkTimeDrift(
  clientTime: string | number,
  serverTime: string | number
): TimeDriftResult {
  const clientMs = typeof clientTime === 'number' ? clientTime : new Date(clientTime).getTime()
  const serverMs = typeof serverTime === 'number' ? serverTime : new Date(serverTime).getTime()

  const driftSeconds = Math.abs((clientMs - serverMs) / 1000)

  if (driftSeconds <= CLOCK_SKEW_TOLERANCE_SECONDS) {
    return { isDrifted: false, driftSeconds, severity: 'none' }
  }

  // Determine severity based on drift magnitude
  let severity: TimeDriftResult['severity'] = 'low'
  if (driftSeconds > DRIFT_THRESHOLDS.CRITICAL) {
    severity = 'critical'
  } else if (driftSeconds > DRIFT_THRESHOLDS.HIGH) {
    severity = 'high'
  } else if (driftSeconds > DRIFT_THRESHOLDS.MEDIUM) {
    severity = 'medium'
  }

  return { isDrifted: true, driftSeconds, severity }
}

// ──────────────────────────────────────────────────────────────
// 2. checkDuplicateSubmission
// ──────────────────────────────────────────────────────────────

/**
 * Checks if an exam session has already been submitted.
 * Prevents double-submit attacks.
 *
 * @param sessionId - The exam session ID
 * @returns DuplicateCheckResult
 */
export async function checkDuplicateSubmission(
  sessionId: string
): Promise<DuplicateCheckResult> {
  const svc = createServiceClient()
  if (!svc) return { isDuplicate: false }

  const { data: session } = await svc
    .from('exam_sessions')
    .select('status, submitted_at, timed_out_at')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session) {
    return { isDuplicate: false }
  }

  const closedStatuses = new Set(['submitted', 'timed_out', 'graded'])

  if (closedStatuses.has(session.status)) {
    return {
      isDuplicate: true,
      existingStatus: session.status,
      submittedAt: session.submitted_at ?? session.timed_out_at ?? undefined,
    }
  }

  return { isDuplicate: false }
}

// ──────────────────────────────────────────────────────────────
// 3. checkMultipleTabs
// ──────────────────────────────────────────────────────────────

/**
 * Detects concurrent tabs via session token comparison.
 * Each tab that connects to an exam session receives a unique tab token.
 * If a request comes with a different tab token, it indicates multiple tabs.
 *
 * @param sessionId  - The exam session ID
 * @param clientToken - The tab token sent by the client
 * @returns MultipleTabsCheckResult
 */
export async function checkMultipleTabs(
  sessionId: string,
  clientToken: string
): Promise<MultipleTabsCheckResult> {
  const svc = createServiceClient()
  if (!svc) return { isMultipleTabs: false, severity: 'none' }

  const { data: session } = await svc
    .from('exam_sessions')
    .select('tab_token')
    .eq('id', sessionId)
    .maybeSingle()

  if (!session || !session.tab_token) {
    return { isMultipleTabs: false, severity: 'none' }
  }

  // If the client token doesn't match the session's token, another tab is active
  if (clientToken !== session.tab_token) {
    // Record the tamper event
    await recordTamperEvent(sessionId, 'multiple_tabs', {
      sessionTabToken: session.tab_token,
      clientTabToken: clientToken,
    })

    logger.security('Multiple tabs detected', {
      sessionId,
      sessionTabToken: session.tab_token,
      clientTabToken: clientToken,
    })

    return {
      isMultipleTabs: true,
      currentTabToken: session.tab_token as string,
      severity: 'high',
    }
  }

  return { isMultipleTabs: false, currentTabToken: session.tab_token as string, severity: 'none' }
}

// ──────────────────────────────────────────────────────────────
// 4. checkModifiedExamId
// ──────────────────────────────────────────────────────────────

/**
 * Validates that the exam ID hasn't been tampered with.
 * The client might try to submit answers for a different exam.
 *
 * @param clientExamId  - The exam ID from the client request
 * @param sessionExamId - The exam ID from the server session
 * @returns IdModificationCheckResult
 */
export function checkModifiedExamId(
  clientExamId: string,
  sessionExamId: string
): IdModificationCheckResult {
  if (clientExamId !== sessionExamId) {
    logger.security('Modified exam ID detected', {
      clientExamId,
      sessionExamId,
    })

    return {
      isModified: true,
      expected: sessionExamId,
      received: clientExamId,
    }
  }

  return { isModified: false, expected: sessionExamId, received: clientExamId }
}

// ──────────────────────────────────────────────────────────────
// 5. checkModifiedStudentId
// ──────────────────────────────────────────────────────────────

/**
 * Validates that the student identity hasn't been tampered with.
 * The client might try to submit answers on behalf of another student.
 *
 * @param clientUserId  - The user ID from the client request
 * @param sessionUserId - The user ID from the server session
 * @returns IdModificationCheckResult
 */
export function checkModifiedStudentId(
  clientUserId: string,
  sessionUserId: string
): IdModificationCheckResult {
  if (clientUserId !== sessionUserId) {
    logger.security('Modified student ID detected', {
      clientUserId,
      sessionUserId,
    })

    return {
      isModified: true,
      expected: sessionUserId,
      received: clientUserId,
    }
  }

  return { isModified: false, expected: sessionUserId, received: clientUserId }
}

// ──────────────────────────────────────────────────────────────
// 6. recordTamperEvent
// ──────────────────────────────────────────────────────────────

/**
 * Logs a tamper event for audit.
 * Tamper events are immutable — they can never be deleted or modified.
 *
 * @param sessionId - The exam session ID
 * @param type      - The type of tamper event
 * @param details   - Details about the tamper attempt
 * @returns The created tamper event ID
 */
export async function recordTamperEvent(
  sessionId: string,
  type: string,
  details: Record<string, unknown>
): Promise<string> {
  const svc = createServiceClient()
  if (!svc) throw new Error('[CBT] Service client unavailable — cannot record tamper event')

  // Determine severity based on type
  let severity = 'low'
  if (type === 'time_drift') {
    const driftSeconds = (details.driftSeconds as number) ?? 0
    if (driftSeconds > 300) severity = 'critical'
    else if (driftSeconds > 120) severity = 'high'
    else if (driftSeconds > 60) severity = 'medium'
  } else if (type === 'multiple_tabs' || type === 'modified_student_id') {
    severity = 'high'
  } else if (type === 'modified_exam_id') {
    severity = 'critical'
  } else if (type === 'duplicate_submission') {
    severity = 'medium'
  }

  // Check for escalating severity — multiple low events → medium
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { count: recentTamperCount } = await svc
    .from('tamper_events')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .gte('created_at', fiveMinutesAgo)

  if ((recentTamperCount ?? 0) >= 3 && severity === 'low') {
    severity = 'medium'
  }
  if ((recentTamperCount ?? 0) >= 5) {
    severity = 'high'
  }

  const { data: event, error } = await svc
    .from('tamper_events')
    .insert({
      session_id: sessionId,
      type,
      details: JSON.stringify(details),
      severity,
      server_timestamp: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !event) {
    logger.error('Failed to record tamper event', new Error(error?.message ?? 'no row'), {
      sessionId,
      type,
    })
    throw new Error(`Failed to record tamper event: ${error?.message}`)
  }

  logger.security('Tamper event recorded', {
    tamperEventId: event.id,
    sessionId,
    type,
    severity,
    details,
  })

  return event.id
}

// ──────────────────────────────────────────────────────────────
// 7. getTamperEvents
// ──────────────────────────────────────────────────────────────

/**
 * Gets all tamper events for a session (for admin review).
 *
 * @param sessionId - The exam session ID
 * @returns Array of tamper events
 */
export async function getTamperEvents(
  sessionId: string
): Promise<Array<{
  id: string
  type: string
  details: string
  severity: string
  serverTimestamp: string
  createdAt: string
}>> {
  const svc = createServiceClient()
  if (!svc) return []

  const { data: events } = await svc
    .from('tamper_events')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  return ((events ?? []) as Array<{
    id: string
    type: string
    details: string
    severity: string
    server_timestamp: string
    created_at: string
  }>).map(e => ({
    id: e.id,
    type: e.type,
    details: e.details,
    severity: e.severity,
    serverTimestamp: new Date(e.server_timestamp).toISOString(),
    createdAt: new Date(e.created_at).toISOString(),
  }))
}

// ──────────────────────────────────────────────────────────────
// 8. getSessionTamperScore
// ──────────────────────────────────────────────────────────────

/**
 * Computes an overall tamper risk score for a session.
 * Used by admins to quickly assess if a student may have cheated.
 *
 * @param sessionId - The exam session ID
 * @returns Score from 0-100 (0 = no risk, 100 = extreme risk)
 */
export async function getSessionTamperScore(sessionId: string): Promise<number> {
  const svc = createServiceClient()
  if (!svc) return 0

  const { data: events } = await svc
    .from('tamper_events')
    .select('severity')
    .eq('session_id', sessionId)

  if (!events || events.length === 0) return 0

  let score = 0
  for (const event of events as Array<{ severity: string }>) {
    switch (event.severity) {
      case 'critical': score += 30; break
      case 'high':     score += 20; break
      case 'medium':   score += 10; break
      case 'low':      score += 5;  break
    }
  }

  return Math.min(100, score)
}
