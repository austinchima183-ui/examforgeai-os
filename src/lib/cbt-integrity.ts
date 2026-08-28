// ============================================================================
// ExamForge AI — Server-Authoritative CBT Exam Integrity Module
// ============================================================================
// This module ensures the SERVER is the sole authority for:
//   - Exam timing (start, end, remaining seconds — never trusts client clocks)
//   - Answer submissions (server timestamps, versioning, deduplication)
//   - Exam submission (locking, auto-grading trigger, double-submit prevention)
//   - Attempt locking (prevents concurrent sessions across tabs/devices)
//   - Auto-submission on expiry (server-side timer/cron driven)
//   - Tamper detection (compares client claims against server truth)
//   - Audit trail (immutable log of all exam events)
//
// CRITICAL SECURITY PRINCIPLES:
//   1. ALL timestamps are generated server-side via new Date().toISOString()
//   2. Client-provided timestamps are LOGGED for forensic analysis but NEVER
//      used for timing, scoring, or state transitions.
//   3. Attempt locking uses atomic DB operations to prevent race conditions.
//   4. Every state mutation is recorded in the audit trail.
//   5. Tamper detection compares client claims against server-authoritative state
//      with defined tolerances to account for network latency.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface ExamTimeState {
  examId: string
  studentId: string
  attemptId: string
  startedAt: string // ISO — server-authoritative
  endsAt: string // ISO — server-authoritative
  remainingSeconds: number
  isExpired: boolean
  serverTime: string // ISO — the authoritative time
}

export interface SubmitAnswerParams {
  attemptId: string
  questionId: string
  answerData: Record<string, unknown>
  /** Client-provided timestamp — LOGGED but NEVER trusted for timing decisions */
  clientTimestamp?: string
}

export interface SubmitAnswerResult {
  success: boolean
  answerVersion: number
  serverTimestamp: string
  error?: string
}

export interface SubmitExamParams {
  attemptId: string
  studentId: string
  examId: string
}

export interface SubmitExamResult {
  success: boolean
  submissionId?: string
  submittedAt?: string
  totalQuestions: number
  answeredQuestions: number
  error?: string
}

export interface ClientExamState {
  remainingSeconds: number
  currentQuestionIndex: number
  answers: Record<string, unknown>
  lastSavedAt: string
}

export interface ServerExamState {
  remainingSeconds: number
  totalQuestions: number
  endsAt: string
  isExpired: boolean
}

export interface TamperResult {
  isTampered: boolean
  violations: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface ExamAuditEvent {
  attemptId: string
  examId: string
  studentId: string
  eventType:
    | 'answer_save'
    | 'answer_change'
    | 'submit'
    | 'auto_submit'
    | 'tamper_detected'
    | 'reconnect'
    | 'page_refresh'
    | 'tab_switch'
    | 'offline'
    | 'online'
  eventData?: Record<string, unknown>
  clientIp?: string
  userAgent?: string
}

interface AutoSubmitResult {
  success: boolean
  attemptId: string
  submittedAt: string
  answeredQuestions: number
  totalQuestions: number
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

/**
 * Maximum allowable clock skew between client and server before flagging
 * as a tampering violation. 30 seconds accounts for typical NTP drift
 * plus network latency, but is far too small to meaningfully extend an exam.
 */
const CLOCK_SKEW_TOLERANCE_SECONDS = 30

/**
 * DB table names — single source of truth for table references.
 */
const TABLES = {
  EXAMS: 'exams',
  EXAM_ATTEMPTS: 'exam_attempts',
  EXAM_ANSWERS: 'exam_answers',
  EXAM_ANSWER_VERSIONS: 'exam_answer_versions',
  EXAM_AUDIT_LOG: 'exam_audit_log',
  QUESTIONS: 'questions',
} as const

/**
 * Attempt statuses — defines the valid state machine transitions.
 *
 * not_started → in_progress → submitted → graded
 *                          ↘ timed_out → graded
 */
const ATTEMPT_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  TIMED_OUT: 'timed_out',
  GRADED: 'graded',
} as const

/** statuses that indicate the attempt is already closed — no further mutations allowed */
const CLOSED_STATUSES = new Set([
  ATTEMPT_STATUS.SUBMITTED,
  ATTEMPT_STATUS.TIMED_OUT,
  ATTEMPT_STATUS.GRADED,
])

// ──────────────────────────────────────────────────────────────
// Helper: Server Timestamp
// ──────────────────────────────────────────────────────────────

/**
 * Returns the current server time as an ISO 8601 string.
 * This is the ONLY way to obtain timestamps for exam operations.
 * NEVER accept timestamps from the client for timing decisions.
 */
function serverNow(): string {
  return new Date().toISOString()
}

/**
 * Calculate the difference in seconds between two ISO timestamps.
 * Positive = `later` is after `earlier`.
 */
function diffSeconds(earlier: string, later: string): number {
  return (new Date(later).getTime() - new Date(earlier).getTime()) / 1000
}

// ──────────────────────────────────────────────────────────────
// 1. Server-Authoritative Exam Timing
// ──────────────────────────────────────────────────────────────

/**
 * Fetches the server-authoritative exam time state.
 *
 * SECURITY: All time calculations use the server clock. The client
 * must call this function (via API) on every timer tick or reconnect
 * to obtain the true remaining time. The client MUST NOT compute
 * remaining time from its own clock.
 *
 * @param examId    - The exam ID
 * @param studentId - The student ID
 * @returns ExamTimeState with server-authoritative times
 */
export async function getServerExamTime(
  examId: string,
  studentId: string
): Promise<ExamTimeState> {
  const supabase = await createClient()
  const serverTime = serverNow()

  // ── Fetch the exam attempt (server truth) ──
  // SECURITY: We read start_time, end_time from the DB — never from the client.
  const { data: attempt, error: attemptError } = await supabase
    .from(TABLES.EXAM_ATTEMPTS)
    .select('id, started_at, ends_at, status')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (attemptError) {
    logger.error('Failed to fetch exam attempt for timing', attemptError, {
      examId,
      studentId,
    })
    throw new Error(`Failed to fetch exam attempt: ${attemptError.message}`)
  }

  if (!attempt) {
    throw new Error(`No exam attempt found for exam ${examId} and student ${studentId}`)
  }

  const startedAt = attempt.started_at
  const endsAt = attempt.ends_at

  // ── Calculate remaining time using SERVER clock ──
  // SECURITY: `serverTime` comes from `new Date()` on this server process.
  // The client's clock is never consulted.
  const remainingSeconds = Math.max(0, diffSeconds(serverTime, endsAt))
  const isExpired = remainingSeconds <= 0

  // ── If expired and attempt is still in_progress, auto-mark as expired ──
  // This is a safety net — the cron/auto-submit handler is the primary mechanism.
  if (isExpired && attempt.status === ATTEMPT_STATUS.IN_PROGRESS) {
    const { error: updateError } = await supabase
      .from(TABLES.EXAM_ATTEMPTS)
      .update({
        status: ATTEMPT_STATUS.TIMED_OUT,
        // Record the server-determined expiry time, NOT a client time
        timed_out_at: serverTime,
      })
      .eq('id', attempt.id)
      .eq('status', ATTEMPT_STATUS.IN_PROGRESS) // Atomic: only if still in_progress

    if (updateError) {
      // Log but don't fail — another process may have already updated it
      logger.warn('Failed to auto-mark attempt as timed_out', {
        attemptId: attempt.id,
        error: updateError.message,
      })
    } else {
      logger.info('Attempt auto-marked as timed_out on time check', {
        attemptId: attempt.id,
        examId,
        studentId,
        serverTime,
      })

      // Record audit event for the auto-expiry
      await recordExamAuditEvent({
        attemptId: attempt.id,
        examId,
        studentId,
        eventType: 'auto_submit',
        eventData: {
          reason: 'server_time_check_detected_expiry',
          serverTime,
          endsAt,
          remainingSeconds: 0,
        },
      })
    }
  }

  return {
    examId,
    studentId,
    attemptId: attempt.id,
    startedAt,
    endsAt,
    remainingSeconds: Math.round(remainingSeconds),
    isExpired,
    serverTime,
  }
}

// ──────────────────────────────────────────────────────────────
// 2. Server-Authoritative Answer Submission
// ──────────────────────────────────────────────────────────────

/**
 * Submits an answer for a question within an exam attempt.
 *
 * SECURITY:
 *   - Validates the attempt is still active (not expired, not submitted)
 *   - Records the answer with a SERVER timestamp (never trusts clientTimestamp)
 *   - Stores each answer change as a new version (full audit trail)
 *   - Prevents submission to closed attempts
 *   - clientTimestamp is logged for forensic analysis only
 *
 * @param params - SubmitAnswerParams including optional clientTimestamp
 * @returns SubmitAnswerResult with version number and server timestamp
 */
export async function submitExamAnswer(
  params: SubmitAnswerParams
): Promise<SubmitAnswerResult> {
  const supabase = await createClient()
  const serverTimestamp = serverNow()
  const { attemptId, questionId, answerData, clientTimestamp } = params

  // ── Validate attempt is still active ──
  // SECURITY: We check the attempt status atomically from the DB.
  const { data: attempt, error: attemptError } = await supabase
    .from(TABLES.EXAM_ATTEMPTS)
    .select('id, exam_id, student_id, status, ends_at')
    .eq('id', attemptId)
    .maybeSingle()

  if (attemptError) {
    logger.error('Failed to fetch attempt for answer submission', attemptError, {
      attemptId,
    })
    return {
      success: false,
      answerVersion: 0,
      serverTimestamp,
      error: 'Failed to validate exam attempt',
    }
  }

  if (!attempt) {
    return {
      success: false,
      answerVersion: 0,
      serverTimestamp,
      error: 'Exam attempt not found',
    }
  }

  // ── Check attempt is not closed ──
  if (CLOSED_STATUSES.has(attempt.status)) {
    logger.security('Answer submission rejected — attempt already closed', {
      attemptId,
      status: attempt.status,
      questionId,
    })
    return {
      success: false,
      answerVersion: 0,
      serverTimestamp,
      error: `Cannot submit answer: attempt is ${attempt.status}`,
    }
  }

  // ── Check exam time has not expired ──
  // SECURITY: Compare server time against DB-stored ends_at
  if (diffSeconds(serverTimestamp, attempt.ends_at) <= 0) {
    logger.security('Answer submission rejected — exam time expired', {
      attemptId,
      serverTimestamp,
      endsAt: attempt.ends_at,
      questionId,
    })
    return {
      success: false,
      answerVersion: 0,
      serverTimestamp,
      error: 'Exam time has expired — no further answers accepted',
    }
  }

  // ── Get current answer version (for versioning) ──
  const { data: existingAnswer } = await supabase
    .from(TABLES.EXAM_ANSWERS)
    .select('id, version')
    .eq('attempt_id', attemptId)
    .eq('question_id', questionId)
    .maybeSingle()

  const currentVersion = existingAnswer?.version ?? 0
  const newVersion = currentVersion + 1
  const isChange = currentVersion > 0

  // ── Insert answer version history entry ──
  // SECURITY: Every change is recorded — the student cannot silently overwrite
  // a previous answer without leaving a trace.
  const { error: versionError } = await supabase
    .from(TABLES.EXAM_ANSWER_VERSIONS)
    .insert({
      attempt_id: attemptId,
      question_id: questionId,
      answer_data: answerData,
      version: newVersion,
      // SECURITY: Server timestamp — the authoritative time of this change
      saved_at: serverTimestamp,
      // Forensic: log client timestamp for comparison, but NEVER use it for logic
      client_timestamp: clientTimestamp ?? null,
    })

  if (versionError) {
    logger.error('Failed to insert answer version record', versionError, {
      attemptId,
      questionId,
      version: newVersion,
    })
    return {
      success: false,
      answerVersion: 0,
      serverTimestamp,
      error: 'Failed to record answer version',
    }
  }

  // ── Upsert the current answer (latest version) ──
  if (existingAnswer) {
    // Update existing answer
    const { error: updateError } = await supabase
      .from(TABLES.EXAM_ANSWERS)
      .update({
        answer_data: answerData,
        version: newVersion,
        // SECURITY: Server timestamp
        saved_at: serverTimestamp,
        client_timestamp: clientTimestamp ?? null,
      })
      .eq('id', existingAnswer.id)

    if (updateError) {
      logger.error('Failed to update answer', updateError, {
        attemptId,
        questionId,
        version: newVersion,
      })
      return {
        success: false,
        answerVersion: 0,
        serverTimestamp,
        error: 'Failed to update answer',
      }
    }
  } else {
    // Insert new answer
    const { error: insertError } = await supabase
      .from(TABLES.EXAM_ANSWERS)
      .insert({
        attempt_id: attemptId,
        question_id: questionId,
        answer_data: answerData,
        version: newVersion,
        // SECURITY: Server timestamp
        saved_at: serverTimestamp,
        client_timestamp: clientTimestamp ?? null,
      })

    if (insertError) {
      logger.error('Failed to insert answer', insertError, {
        attemptId,
        questionId,
      })
      return {
        success: false,
        answerVersion: 0,
        serverTimestamp,
        error: 'Failed to save answer',
      }
    }
  }

  // ── Record audit event ──
  await recordExamAuditEvent({
    attemptId,
    examId: attempt.exam_id,
    studentId: attempt.student_id,
    eventType: isChange ? 'answer_change' : 'answer_save',
    eventData: {
      questionId,
      version: newVersion,
      serverTimestamp,
      // Forensic: log the client's claimed time for tamper detection
      clientTimestamp: clientTimestamp ?? null,
      clockSkewSeconds: clientTimestamp
        ? diffSeconds(clientTimestamp, serverTimestamp)
        : null,
    },
  })

  return {
    success: true,
    answerVersion: newVersion,
    serverTimestamp,
  }
}

// ──────────────────────────────────────────────────────────────
// 3. Server-Authoritative Exam Submission
// ──────────────────────────────────────────────────────────────

/**
 * Submits an exam attempt for final grading.
 *
 * SECURITY:
 *   - Verifies attempt is active and not already submitted (idempotency)
 *   - Checks all questions have answers (or marks as unanswered)
 *   - Sets submission timestamp from SERVER clock (never client)
 *   - Locks the attempt atomically (status = 'submitted')
 *   - Triggers auto-grading
 *   - Prevents double submission via atomic status check
 *
 * @param params - SubmitExamParams
 * @returns SubmitExamResult with submission details
 */
export async function submitExam(
  params: SubmitExamParams
): Promise<SubmitExamResult> {
  const supabase = await createClient()
  const serverTimestamp = serverNow()
  const { attemptId, studentId, examId } = params

  // ── Prevent duplicate submission: check attempt status atomically ──
  // SECURITY: The UPDATE ... WHERE status='in_progress' is an atomic operation.
  // If two requests arrive simultaneously, only one will succeed.
  const { data: lockResult, error: lockError } = await supabase
    .from(TABLES.EXAM_ATTEMPTS)
    .update({
      status: ATTEMPT_STATUS.SUBMITTED,
      // SECURITY: Server-authoritative submission timestamp
      submitted_at: serverTimestamp,
    })
    .eq('id', attemptId)
    .eq('student_id', studentId)
    .eq('status', ATTEMPT_STATUS.IN_PROGRESS)
    .select('id, exam_id')
    .maybeSingle()

  if (lockError) {
    logger.error('Failed to lock attempt for submission', lockError, {
      attemptId,
    })
    return {
      success: false,
      totalQuestions: 0,
      answeredQuestions: 0,
      error: 'Failed to submit exam — please try again',
    }
  }

  if (!lockResult) {
    // Attempt was not in 'in_progress' status — either already submitted,
    // timed out, or doesn't belong to this student.
    logger.security('Exam submission rejected — attempt not in_progress', {
      attemptId,
      studentId,
      examId,
    })

    // Fetch current status for a more informative error
    const { data: currentAttempt } = await supabase
      .from(TABLES.EXAM_ATTEMPTS)
      .select('status')
      .eq('id', attemptId)
      .maybeSingle()

    const statusMsg = currentAttempt?.status ?? 'unknown'
    return {
      success: false,
      totalQuestions: 0,
      answeredQuestions: 0,
      error: `Exam cannot be submitted: attempt status is '${statusMsg}'`,
    }
  }

  // ── Count total questions and answered questions ──
  const [questionsResult, answersResult] = await Promise.all([
    supabase
      .from(TABLES.QUESTIONS)
      .select('id', { count: 'exact' })
      .eq('exam_id', examId),
    supabase
      .from(TABLES.EXAM_ANSWERS)
      .select('question_id', { count: 'exact' })
      .eq('attempt_id', attemptId),
  ])

  const totalQuestions = questionsResult.count ?? 0
  const answeredQuestions = answersResult.count ?? 0

  // ── Identify unanswered questions ──
  if (questionsResult.data && answersResult.data) {
    const answeredIds = new Set(answersResult.data.map((a: { question_id: string }) => a.question_id))
    const unansweredIds = questionsResult.data
      .map((q: { id: string }) => q.id)
      .filter((id: string) => !answeredIds.has(id))

    if (unansweredIds.length > 0) {
      logger.info('Exam submitted with unanswered questions', {
        attemptId,
        examId,
        unansweredCount: unansweredIds.length,
        unansweredIds,
      })
    }
  }

  // ── Record audit event ──
  await recordExamAuditEvent({
    attemptId,
    examId,
    studentId,
    eventType: 'submit',
    eventData: {
      serverTimestamp,
      totalQuestions,
      answeredQuestions,
      unansweredCount: totalQuestions - answeredQuestions,
    },
  })

  // ── Trigger auto-grading (fire-and-forget) ──
  // The grading is performed asynchronously. Errors in grading
  // are handled by the grading service itself and do not affect
  // the submission result.
  triggerAutoGrading(attemptId, examId).catch((err) => {
    logger.error('Auto-grading trigger failed', err, { attemptId, examId })
  })

  return {
    success: true,
    submissionId: attemptId,
    submittedAt: serverTimestamp,
    totalQuestions,
    answeredQuestions,
  }
}

/**
 * Triggers auto-grading for a submitted exam attempt.
 * This is a fire-and-forget operation — errors are logged but don't
 * block the submission response.
 *
 * SECURITY: Only called AFTER the attempt has been locked to 'submitted' status.
 */
async function triggerAutoGrading(
  attemptId: string,
  examId: string
): Promise<void> {
  const supabase = await createClient()

  // Call the grading RPC function if it exists
  // This is a placeholder — the actual grading logic would be in a
  // Supabase RPC function or a separate microservice.
  const { error } = await supabase.rpc('auto_grade_exam', {
    p_attempt_id: attemptId,
    p_exam_id: examId,
  })

  if (error) {
    // If the RPC doesn't exist, we log but don't fail — grading can be triggered later
    logger.warn('Auto-grading RPC not available or failed', {
      attemptId,
      examId,
      error: error.message,
    })
  } else {
    logger.info('Auto-grading triggered successfully', {
      attemptId,
      examId,
    })
  }
}

// ──────────────────────────────────────────────────────────────
// 4. Attempt Locking
// ──────────────────────────────────────────────────────────────

/**
 * Acquires an exclusive lock on an exam attempt.
 *
 * SECURITY: Uses an atomic DB update:
 *   UPDATE exam_attempts SET status='in_progress' WHERE id=? AND status='not_started'
 *
 * This is a compare-and-swap (CAS) operation — if another tab/device has
 * already started the attempt, this will return false. This prevents
 * students from running multiple concurrent exam sessions.
 *
 * @param attemptId - The exam attempt ID to lock
 * @returns true if lock acquired, false if already locked
 */
export async function lockExamAttempt(
  attemptId: string
): Promise<boolean> {
  const supabase = await createClient()
  const serverTimestamp = serverNow()

  // ── Atomic CAS: only succeeds if status is 'not_started' ──
  const { data, error } = await supabase
    .from(TABLES.EXAM_ATTEMPTS)
    .update({
      status: ATTEMPT_STATUS.IN_PROGRESS,
      // SECURITY: Server-authoritative start time
      started_at: serverTimestamp,
    })
    .eq('id', attemptId)
    .eq('status', ATTEMPT_STATUS.NOT_STARTED)
    .select('id, exam_id, student_id')
    .maybeSingle()

  if (error) {
    logger.error('Failed to acquire attempt lock', error, { attemptId })
    return false
  }

  if (!data) {
    // Lock not acquired — attempt is already in progress or in another state
    logger.security('Attempt lock denied — already locked or wrong status', {
      attemptId,
    })

    // Check current status for audit
    const { data: currentAttempt } = await supabase
      .from(TABLES.EXAM_ATTEMPTS)
      .select('status, student_id, exam_id')
      .eq('id', attemptId)
      .maybeSingle()

    if (currentAttempt) {
      await recordExamAuditEvent({
        attemptId,
        examId: currentAttempt.exam_id,
        studentId: currentAttempt.student_id,
        eventType: 'tamper_detected',
        eventData: {
          reason: 'attempt_lock_denied',
          currentStatus: currentAttempt.status,
          expectedStatus: ATTEMPT_STATUS.NOT_STARTED,
        },
      })
    }

    return false
  }

  // Lock acquired successfully
  logger.info('Attempt lock acquired', {
    attemptId,
    serverTimestamp,
  })

  return true
}

// ──────────────────────────────────────────────────────────────
// 5. Duplicate Submission Prevention
// ──────────────────────────────────────────────────────────────

/**
 * Checks whether an exam attempt can accept a submission.
 * Returns false if the attempt is already in a terminal state
 * (submitted, timed_out, or graded).
 *
 * SECURITY: This reads from the DB (server truth), never from client state.
 * Must be called BEFORE any submission operation to prevent duplicates.
 *
 * @param attemptId - The exam attempt ID
 * @returns true if submission is allowed, false if already submitted/closed
 */
export async function preventDuplicateSubmission(
  attemptId: string
): Promise<boolean> {
  const supabase = await createClient()

  const { data: attempt, error } = await supabase
    .from(TABLES.EXAM_ATTEMPTS)
    .select('id, status')
    .eq('id', attemptId)
    .maybeSingle()

  if (error) {
    logger.error('Failed to check attempt status for duplicate prevention', error, {
      attemptId,
    })
    // SECURITY: Fail closed — if we can't verify the status, deny submission
    return false
  }

  if (!attempt) {
    logger.security('Duplicate check failed — attempt not found', { attemptId })
    return false
  }

  // Only 'in_progress' attempts can accept submissions
  if (CLOSED_STATUSES.has(attempt.status)) {
    logger.security('Duplicate submission prevented — attempt already closed', {
      attemptId,
      status: attempt.status,
    })
    return false
  }

  return true
}

// ──────────────────────────────────────────────────────────────
// 6. Auto-Submit on Expiry
// ──────────────────────────────────────────────────────────────

/**
 * Auto-submits an exam attempt that has expired.
 * Called by a server-side timer, cron job, or edge function —
 * NEVER by client-side code.
 *
 * SECURITY:
 *   - Only processes attempts that are still 'in_progress'
 *   - Uses atomic status update to prevent race conditions
 *   - Records auto-submit in the audit trail with reason='timed_out'
 *   - Sets status to 'timed_out' (not 'submitted') to distinguish
 *     manual vs automatic submissions
 *
 * @param attemptId - The exam attempt ID to auto-submit
 * @returns AutoSubmitResult with details of the auto-submission
 */
export async function autoSubmitExpiredExam(
  attemptId: string
): Promise<AutoSubmitResult> {
  const supabase = await createClient()
  const serverTimestamp = serverNow()

  // ── Fetch attempt details ──
  const { data: attempt, error: attemptError } = await supabase
    .from(TABLES.EXAM_ATTEMPTS)
    .select('id, exam_id, student_id, status, ends_at')
    .eq('id', attemptId)
    .maybeSingle()

  if (attemptError) {
    logger.error('Failed to fetch attempt for auto-submit', attemptError, {
      attemptId,
    })
    return {
      success: false,
      attemptId,
      submittedAt: serverTimestamp,
      answeredQuestions: 0,
      totalQuestions: 0,
    }
  }

  if (!attempt) {
    logger.warn('Attempt not found for auto-submit', { attemptId })
    return {
      success: false,
      attemptId,
      submittedAt: serverTimestamp,
      answeredQuestions: 0,
      totalQuestions: 0,
    }
  }

  // ── Only auto-submit if still in_progress ──
  if (attempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
    logger.info('Auto-submit skipped — attempt not in_progress', {
      attemptId,
      currentStatus: attempt.status,
    })
    return {
      success: false,
      attemptId,
      submittedAt: serverTimestamp,
      answeredQuestions: 0,
      totalQuestions: 0,
    }
  }

  // ── Verify the exam has actually expired (server time > ends_at) ──
  // SECURITY: We use the server clock, not the client clock.
  const remainingSeconds = diffSeconds(serverTimestamp, attempt.ends_at)
  if (remainingSeconds > 0) {
    logger.warn('Auto-submit skipped — exam has not expired yet', {
      attemptId,
      serverTimestamp,
      endsAt: attempt.ends_at,
      remainingSeconds,
    })
    return {
      success: false,
      attemptId,
      submittedAt: serverTimestamp,
      answeredQuestions: 0,
      totalQuestions: 0,
    }
  }

  // ── Atomically lock the attempt to 'timed_out' ──
  // SECURITY: The WHERE clause ensures only 'in_progress' attempts are updated,
  // preventing race conditions with manual submissions.
  const { data: updateResult, error: updateError } = await supabase
    .from(TABLES.EXAM_ATTEMPTS)
    .update({
      status: ATTEMPT_STATUS.TIMED_OUT,
      // SECURITY: Server-authoritative timestamp
      submitted_at: serverTimestamp,
      timed_out_at: serverTimestamp,
    })
    .eq('id', attemptId)
    .eq('status', ATTEMPT_STATUS.IN_PROGRESS) // Atomic guard
    .select('id')
    .maybeSingle()

  if (updateError) {
    logger.error('Failed to auto-submit — atomic update failed', updateError, {
      attemptId,
    })
    return {
      success: false,
      attemptId,
      submittedAt: serverTimestamp,
      answeredQuestions: 0,
      totalQuestions: 0,
    }
  }

  if (!updateResult) {
    // Another process already updated the status (race condition resolved safely)
    logger.info('Auto-submit skipped — attempt status changed concurrently', {
      attemptId,
    })
    return {
      success: false,
      attemptId,
      submittedAt: serverTimestamp,
      answeredQuestions: 0,
      totalQuestions: 0,
    }
  }

  // ── Count answered and total questions ──
  const [questionsResult, answersResult] = await Promise.all([
    supabase
      .from(TABLES.QUESTIONS)
      .select('id', { count: 'exact' })
      .eq('exam_id', attempt.exam_id),
    supabase
      .from(TABLES.EXAM_ANSWERS)
      .select('question_id', { count: 'exact' })
      .eq('attempt_id', attemptId),
  ])

  const totalQuestions = questionsResult.count ?? 0
  const answeredQuestions = answersResult.count ?? 0

  // ── Record audit event ──
  await recordExamAuditEvent({
    attemptId,
    examId: attempt.exam_id,
    studentId: attempt.student_id,
    eventType: 'auto_submit',
    eventData: {
      reason: 'exam_time_expired',
      serverTimestamp,
      endsAt: attempt.ends_at,
      totalQuestions,
      answeredQuestions,
      unansweredCount: totalQuestions - answeredQuestions,
    },
  })

  logger.info('Exam auto-submitted on expiry', {
    attemptId,
    examId: attempt.exam_id,
    studentId: attempt.student_id,
    totalQuestions,
    answeredQuestions,
    serverTimestamp,
  })

  // ── Trigger auto-grading ──
  triggerAutoGrading(attemptId, attempt.exam_id).catch((err) => {
    logger.error('Auto-grading trigger failed after auto-submit', err, {
      attemptId,
      examId: attempt.exam_id,
    })
  })

  return {
    success: true,
    attemptId,
    submittedAt: serverTimestamp,
    answeredQuestions,
    totalQuestions,
  }
}

// ──────────────────────────────────────────────────────────────
// 7. Tamper Detection
// ──────────────────────────────────────────────────────────────

/**
 * Compares client-provided exam state against server-authoritative state
 * to detect potential tampering.
 *
 * CHECKS:
 *   1. Clock skew: client's remaining time vs server's remaining time
 *      (tolerance: 30 seconds for network latency + NTP drift)
 *   2. Duration extension: client claiming more time than the server allows
 *   3. Question tampering: client claiming a different question count
 *   4. Post-expiry submission: client attempting actions after server-side expiry
 *
 * SEVERITY LEVELS:
 *   - low:      Minor clock skew (within tolerance), likely benign
 *   - medium:   Clock skew beyond tolerance, possible NTP issue
 *   - high:     Client claiming more time or different questions
 *   - critical: Client submitting after server-side expiry
 *
 * SECURITY: This function is PURE (no side effects) and SYNCHRONOUS.
 * It does not modify any state — it only returns detection results.
 * The caller is responsible for recording violations via recordExamAuditEvent.
 *
 * @param clientState - The exam state as reported by the client
 * @param serverState - The exam state as computed by the server (source of truth)
 * @returns TamperResult with violations and severity
 */
export function detectTampering(
  clientState: ClientExamState,
  serverState: ServerExamState
): TamperResult {
  const violations: string[] = []
  let severity: TamperResult['severity'] = 'low'

  // ── 1. Clock skew detection ──
  // Compare client's claimed remaining time against server truth.
  const timeDifference = Math.abs(
    clientState.remainingSeconds - serverState.remainingSeconds
  )

  if (timeDifference > CLOCK_SKEW_TOLERANCE_SECONDS) {
    // Client's clock is significantly off
    if (clientState.remainingSeconds > serverState.remainingSeconds) {
      // Client claims MORE time than server — likely clock manipulation
      violations.push(
        `Client claims ${clientState.remainingSeconds}s remaining, ` +
        `server says ${serverState.remainingSeconds}s — ` +
        `client is ${timeDifference}s ahead (possible clock manipulation)`
      )
      severity = 'high'
    } else {
      // Client claims LESS time — possible NTP drift, less concerning
      violations.push(
        `Client claims ${clientState.remainingSeconds}s remaining, ` +
        `server says ${serverState.remainingSeconds}s — ` +
        `client is ${timeDifference}s behind (possible NTP drift)`
      )
      severity = severity === 'low' ? 'medium' : severity
    }
  }

  // ── 2. Duration extension detection ──
  // If the client's remaining time exceeds the total exam duration,
  // something is very wrong.
  if (clientState.remainingSeconds > serverState.remainingSeconds + CLOCK_SKEW_TOLERANCE_SECONDS) {
    violations.push(
      `Client remaining time (${clientState.remainingSeconds}s) significantly exceeds ` +
      `server remaining time (${serverState.remainingSeconds}s) — ` +
      `possible exam duration extension`
    )
    severity = 'high'
  }

  // ── 3. Question tampering detection ──
  // Check if the client's answer set has more keys than the server's total questions.
  // (Client could have injected fake answers or modified question IDs.)
  const clientAnswerCount = Object.keys(clientState.answers).length
  if (clientAnswerCount > serverState.totalQuestions) {
    violations.push(
      `Client has ${clientAnswerCount} answers but exam only has ` +
      `${serverState.totalQuestions} questions — possible question injection`
    )
    severity = 'critical'
  }

  // ── 4. Post-expiry submission detection ──
  // If the server says the exam is expired but the client is still active,
  // the client may be attempting to submit after expiry.
  if (serverState.isExpired && clientState.remainingSeconds > 0) {
    violations.push(
      `Server has marked exam as expired (ends at ${serverState.endsAt}) ` +
      `but client claims ${clientState.remainingSeconds}s remaining — ` +
      `possible post-expiry activity`
    )
    severity = 'critical'
  }

  // ── 5. Stale save timestamp detection ──
  // If the client's lastSavedAt is in the future relative to server time,
  // the client clock is ahead — minor concern but worth flagging.
  if (clientState.lastSavedAt) {
    const lastSavedTime = new Date(clientState.lastSavedAt).getTime()
    const serverEndsAt = new Date(serverState.endsAt).getTime()
    if (lastSavedTime > serverEndsAt + CLOCK_SKEW_TOLERANCE_SECONDS * 1000) {
      violations.push(
        `Client lastSavedAt (${clientState.lastSavedAt}) is after exam end time ` +
        `(${serverState.endsAt}) — possible clock manipulation`
      )
      severity = severity === 'low' ? 'medium' : severity
    }
  }

  return {
    isTampered: violations.length > 0,
    violations,
    severity,
  }
}

// ──────────────────────────────────────────────────────────────
// 8. Audit Trail
// ──────────────────────────────────────────────────────────────

/**
 * Records an exam audit event to the immutable audit log.
 *
 * SECURITY:
 *   - All events are recorded with a SERVER timestamp
 *   - Events are INSERT-ONLY (never updated or deleted)
 *   - Includes client IP and user agent for forensic analysis
 *   - The audit log is the authoritative record of all exam events
 *
 * EVENT TYPES:
 *   - answer_save:    First save of an answer
 *   - answer_change:  Subsequent change to an existing answer
 *   - submit:         Manual exam submission
 *   - auto_submit:    Automatic submission on expiry
 *   - tamper_detected: Tampering violation detected
 *   - reconnect:      Client reconnected after disconnect
 *   - page_refresh:   Client refreshed the page
 *   - tab_switch:     Client switched browser tabs (potential cheating)
 *   - offline:        Client went offline
 *   - online:         Client came back online
 *
 * @param event - ExamAuditEvent to record
 */
export async function recordExamAuditEvent(
  event: ExamAuditEvent
): Promise<void> {
  const supabase = await createClient()
  // SECURITY: Server-authoritative timestamp — never uses client time
  const serverTimestamp = serverNow()

  const { error } = await supabase.from(TABLES.EXAM_AUDIT_LOG).insert({
    attempt_id: event.attemptId,
    exam_id: event.examId,
    student_id: event.studentId,
    event_type: event.eventType,
    event_data: event.eventData ?? {},
    // SECURITY: Server timestamp — the authoritative time of this event
    occurred_at: serverTimestamp,
    client_ip: event.clientIp ?? null,
    user_agent: event.userAgent ?? null,
  })

  if (error) {
    // Audit logging failure is critical but must not crash the exam flow.
    // We log the error to the application logger for alerting.
    logger.error('Failed to record exam audit event', error, {
      attemptId: event.attemptId,
      examId: event.examId,
      eventType: event.eventType,
      serverTimestamp,
    })
  }
}

// ──────────────────────────────────────────────────────────────
// Utility: Get Audit Trail for an Attempt
// ──────────────────────────────────────────────────────────────

/**
 * Retrieves the full audit trail for an exam attempt.
 * Used for forensic analysis, dispute resolution, and cheating investigations.
 *
 * SECURITY: This is a read-only operation. Results are ordered
 * chronologically for easy analysis.
 *
 * @param attemptId - The exam attempt ID
 * @returns Array of audit events in chronological order
 */
export async function getExamAuditTrail(
  attemptId: string
): Promise<ExamAuditEvent[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLES.EXAM_AUDIT_LOG)
    .select('*')
    .eq('attempt_id', attemptId)
    .order('occurred_at', { ascending: true })

  if (error) {
    logger.error('Failed to fetch exam audit trail', error, { attemptId })
    return []
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    attemptId: row.attempt_id as string,
    examId: row.exam_id as string,
    studentId: row.student_id as string,
    eventType: row.event_type as ExamAuditEvent['eventType'],
    eventData: row.event_data as Record<string, unknown> | undefined,
    clientIp: row.client_ip as string | undefined,
    userAgent: row.user_agent as string | undefined,
  }))
}

// ──────────────────────────────────────────────────────────────
// Utility: Check and Record Tampering
// ──────────────────────────────────────────────────────────────

/**
 * Convenience function that detects tampering AND records it in the audit log
 * if violations are found.
 *
 * @param clientState   - Client-reported exam state
 * @param serverState   - Server-authoritative exam state
 * @param auditContext  - Context for the audit event (attempt, exam, student IDs)
 * @returns TamperResult from detectTampering
 */
export async function detectAndRecordTampering(
  clientState: ClientExamState,
  serverState: ServerExamState,
  auditContext: {
    attemptId: string
    examId: string
    studentId: string
    clientIp?: string
    userAgent?: string
  }
): Promise<TamperResult> {
  const result = detectTampering(clientState, serverState)

  if (result.isTampered) {
    await recordExamAuditEvent({
      attemptId: auditContext.attemptId,
      examId: auditContext.examId,
      studentId: auditContext.studentId,
      eventType: 'tamper_detected',
      eventData: {
        violations: result.violations,
        severity: result.severity,
        clientRemainingSeconds: clientState.remainingSeconds,
        serverRemainingSeconds: serverState.remainingSeconds,
        serverIsExpired: serverState.isExpired,
      },
      clientIp: auditContext.clientIp,
      userAgent: auditContext.userAgent,
    })

    logger.security('Exam tampering detected', {
      attemptId: auditContext.attemptId,
      examId: auditContext.examId,
      studentId: auditContext.studentId,
      severity: result.severity,
      violationCount: result.violations.length,
    })
  }

  return result
}

// ──────────────────────────────────────────────────────────────
// Utility: Bulk Auto-Submit for Expired Exams (Cron Helper)
// ──────────────────────────────────────────────────────────────

/**
 * Finds all exam attempts that have expired but are still in 'in_progress'
 * status, and auto-submits them. Designed to be called by a cron job
 * or scheduled edge function.
 *
 * SECURITY: This is a SERVER-ONLY operation. It must NEVER be exposed
 * to client-side code.
 *
 * @returns Number of attempts auto-submitted
 */
export async function bulkAutoSubmitExpiredExams(): Promise<number> {
  const supabase = await createClient()
  const serverTimestamp = serverNow()

  // ── Find all expired in_progress attempts ──
  const { data: expiredAttempts, error } = await supabase
    .from(TABLES.EXAM_ATTEMPTS)
    .select('id')
    .eq('status', ATTEMPT_STATUS.IN_PROGRESS)
    .lt('ends_at', serverTimestamp) // ends_at < now → expired
    .limit(100) // Process in batches to avoid overload

  if (error) {
    logger.error('Failed to fetch expired attempts for bulk auto-submit', error)
    return 0
  }

  if (!expiredAttempts || expiredAttempts.length === 0) {
    return 0
  }

  logger.info('Bulk auto-submit: processing expired attempts', {
    count: expiredAttempts.length,
  })

  // ── Process each expired attempt ──
  let successCount = 0
  for (const attempt of expiredAttempts) {
    try {
      const result = await autoSubmitExpiredExam(attempt.id)
      if (result.success) successCount++
    } catch (err) {
      logger.error('Bulk auto-submit failed for attempt', err, {
        attemptId: attempt.id,
      })
    }
  }

  logger.info('Bulk auto-submit complete', {
    processed: expiredAttempts.length,
    succeeded: successCount,
  })

  return successCount
}
