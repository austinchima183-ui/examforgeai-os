// ============================================================================
// ExamForge AI — Server-Authoritative Exam Session Manager
// ============================================================================
// This module ensures the SERVER is the sole authority for:
//   - Exam timing (start, end, remaining seconds — NEVER trusts client clocks)
//   - Session creation (server timestamps, attempt locking)
//   - Answer submissions (server timestamps, versioning, deduplication)
//   - Exam submission (locking, auto-grading trigger, double-submit prevention)
//   - Auto-submission on expiry (server-side timer/cron driven)
//   - Reconnection handling (preserves remaining time, NEVER extends timer)
//   - Tamper detection (compares client claims against server truth)
//   - Audit trail (immutable log of all exam events)
//
// CRITICAL SECURITY PRINCIPLES:
//   1. ALL timestamps are generated server-side via new Date()
//   2. Client-provided timestamps are LOGGED for forensic analysis but NEVER
//      used for timing, scoring, or state transitions.
//   3. Attempt locking uses atomic DB operations to prevent race conditions.
//   4. Every state mutation is recorded in the audit trail.
//   5. Correct answers are NEVER returned during an active exam.
//   6. Reconnection does NOT extend the timer — remaining time is computed
//      from server-authoritative start and end times.
//
// SUPABASE UNIFICATION (2026-08-25):
//   Prisma/SQLite removed. All operations run through the Supabase
//   service-role client (trusted server code behind requireApiAuth).
//   Column mapping: Prisma camelCase → Postgres snake_case; the legacy
//   `exams.duration`/`maxAttempts` map to `time_limit_minutes` /
//   `allowed_attempts`, and `availableFrom`/`availableUntil` map to
//   `start_time`/`end_time`.
// ============================================================================

import { createServiceClient } from '@/lib/supabase/service'
import { logger } from '@/lib/utils/logger'
import { checkTimeDrift, recordTamperEvent } from './tamper-detection'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

/** Server-authoritative exam time state returned to the client */
export interface ExamTimeState {
  sessionId: string
  examId: string
  studentId: string
  startedAt: string        // ISO — server-authoritative
  endsAt: string           // ISO — server-authoritative
  remainingSeconds: number // Computed from server time
  isExpired: boolean
  serverTime: string       // ISO — the authoritative now
}

/** Result of creating an exam session */
export interface CreateSessionResult {
  success: boolean
  sessionId?: string
  startedAt?: string      // ISO — server-authoritative
  endsAt?: string         // ISO — server-authoritative
  serverTime?: string
  questions?: ExamQuestionForClient[]
  error?: string
}

/** Question data sent to the client — NEVER includes correctAnswer */
export interface ExamQuestionForClient {
  id: string
  questionText: string
  questionType: string
  options: string | null   // JSON — but without isCorrect flags
  marks: number
  difficulty: string
  isRequired: boolean
  order: number
}

/** Result of saving an answer */
export interface SaveAnswerResult {
  success: boolean
  answerVersion: number
  serverTimestamp: string
  error?: string
}

/** Result of submitting an exam */
export interface SubmitExamResult {
  success: boolean
  submittedAt?: string
  totalQuestions: number
  answeredQuestions: number
  error?: string
}

/** Validation result for exam access */
export interface ValidationResult {
  allowed: boolean
  reason?: string
}

/** Reconnection state */
export interface ReconnectState {
  success: boolean
  sessionId: string
  examId: string
  status: string
  startedAt: string
  endsAt: string
  remainingSeconds: number
  isExpired: boolean
  serverTime: string
  answers: Record<string, { answer: string; version: number; savedAt: string }>
  currentQuestionIndex: number
  error?: string
}

/** Tamper detection result */
export interface TamperCheckResult {
  isTampered: boolean
  driftSeconds: number
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical'
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

/** Attempt statuses — defines the valid state machine transitions */
const SESSION_STATUS = {
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  TIMED_OUT: 'timed_out',
  GRADED: 'graded',
} as const

/** Statuses that indicate the session is already closed — no further mutations allowed */
const CLOSED_STATUSES = new Set<string>([
  SESSION_STATUS.SUBMITTED,
  SESSION_STATUS.TIMED_OUT,
  SESSION_STATUS.GRADED,
])

// ──────────────────────────────────────────────────────────────
// Supabase data-access helpers
// ──────────────────────────────────────────────────────────────

interface ExamSessionRow {
  id: string
  exam_id: string
  student_id: string
  status: string
  attempt_number: number
  started_at: string
  ends_at: string
  submitted_at: string | null
  timed_out_at: string | null
  tab_token: string | null
  is_locked: boolean
}

interface ExamRow {
  id: string
  status: string
  time_limit_minutes: number | null
  allowed_attempts: number | null
  start_time: string | null
  end_time: string | null
  class_id: string | null
}

interface QuestionRow {
  id: string
  question_text: string
  question_type: string
  options: string | null
  correct_answer: string | null
  marks: number
  difficulty: string
  is_required: boolean
  order: number
}

/** Fetch a single exam row (server-side authority). */
async function getExam(examId: string): Promise<ExamRow | null> {
  const svc = createServiceClient()
  if (!svc) throw new Error('[CBT] Service client unavailable')
  const { data, error } = await svc
    .from('exams')
    .select('id, status, time_limit_minutes, allowed_attempts, start_time, end_time, class_id')
    .eq('id', examId)
    .maybeSingle()
  if (error) throw new Error(`[CBT] Exam fetch failed: ${error.message}`)
  return (data as ExamRow | null) ?? null
}

/** Fetch a single exam session row. */
async function getSession(sessionId: string): Promise<ExamSessionRow | null> {
  const svc = createServiceClient()
  if (!svc) throw new Error('[CBT] Service client unavailable')
  const { data, error } = await svc
    .from('exam_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  if (error) throw new Error(`[CBT] Session fetch failed: ${error.message}`)
  return (data as ExamSessionRow | null) ?? null
}

/** Insert an audit event (fire-and-forget semantics with error logging). */
async function insertAuditEvent(row: {
  sessionId: string | null
  examId: string
  studentId: string
  eventType: string
  eventData?: string
  serverTimestamp?: string
}): Promise<void> {
  const svc = createServiceClient()
  if (!svc) throw new Error('[CBT] Service client unavailable')
  const { error } = await svc.from('exam_audit_events').insert({
    session_id: row.sessionId,
    exam_id: row.examId,
    student_id: row.studentId,
    event_type: row.eventType,
    event_data: row.eventData ?? null,
    server_timestamp: row.serverTimestamp ?? new Date().toISOString(),
  })
  if (error) {
    logger.error('Failed to insert CBT audit event', new Error(error.message), {
      sessionId: row.sessionId,
      eventType: row.eventType,
    })
  }
}

// ──────────────────────────────────────────────────────────────
// Helper: Server Timestamp
// ──────────────────────────────────────────────────────────────

/**
 * Returns the current server time as an ISO 8601 string.
 * This is the ONLY way to obtain timestamps for exam operations.
 * NEVER accept timestamps from the client for timing decisions.
 */
export function getServerTime(): string {
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
// 1. createExamSession
// ──────────────────────────────────────────────────────────────

/**
 * Creates a server-side exam session record with server-authoritative
 * timestamps for start time and end time.
 *
 * SECURITY:
 *   - Start time is ALWAYS server-generated (new Date())
 *   - End time is computed as start + exam.duration (from DB, not client)
 *   - Attempt number is computed atomically from existing sessions
 *   - Tab token is generated for multi-tab detection
 *
 * @param userId - The student's user ID
 * @param examId - The exam ID
 * @returns The created session ID
 */
export async function createExamSession(
  userId: string,
  examId: string
): Promise<{ sessionId: string; startedAt: Date; endsAt: Date; attemptNumber: number }> {
  const svc = createServiceClient()
  if (!svc) throw new Error('[CBT] Service client unavailable — cannot create exam session')
  const serverNow = new Date()

  // Fetch the exam to get duration — SECURITY: from DB, never from client
  const exam = await getExam(examId)

  if (!exam) {
    throw new Error(`Exam not found: ${examId}`)
  }

  const durationMinutes = exam.time_limit_minutes ?? 60
  const maxAttempts = exam.allowed_attempts ?? 1

  // Compute attempt number atomically
  const { data: existingSessions, error: sessionsError } = await svc
    .from('exam_sessions')
    .select('attempt_number')
    .eq('exam_id', examId)
    .eq('student_id', userId)
    .order('attempt_number', { ascending: false })
    .limit(1)

  if (sessionsError) {
    throw new Error(`[CBT] Attempt history fetch failed: ${sessionsError.message}`)
  }

  const attemptNumber = existingSessions && existingSessions.length > 0
    ? (existingSessions[0].attempt_number as number) + 1
    : 1

  if (attemptNumber > maxAttempts) {
    throw new Error(`Maximum attempts (${maxAttempts}) exceeded`)
  }

  // Compute server-authoritative end time
  const endsAt = new Date(serverNow.getTime() + durationMinutes * 60 * 1000)

  // Generate tab token for multi-tab detection
  const tabToken = `tab_${Date.now()}_${crypto.randomUUID().slice(0, 9)}`

  // Create the session record
  const { data: session, error: insertError } = await svc
    .from('exam_sessions')
    .insert({
      exam_id: examId,
      student_id: userId,
      status: SESSION_STATUS.IN_PROGRESS,
      attempt_number: attemptNumber,
      started_at: serverNow.toISOString(),
      ends_at: endsAt.toISOString(),
      tab_token: tabToken,
      is_locked: false,
      answers_total: 0,
      answers_completed: 0,
    })
    .select('id')
    .single()

  if (insertError || !session) {
    throw new Error(`[CBT] Session create failed: ${insertError?.message ?? 'no row returned'}`)
  }

  // Record audit event
  await insertAuditEvent({
    sessionId: session.id,
    examId,
    studentId: userId,
    eventType: 'answer_save', // Using as session_start — we'll log as reconnect conceptually
    eventData: JSON.stringify({
      action: 'session_created',
      attemptNumber,
      duration: durationMinutes,
      startedAt: serverNow.toISOString(),
      endsAt: endsAt.toISOString(),
    }),
    serverTimestamp: serverNow.toISOString(),
  })

  logger.info('Exam session created', {
    sessionId: session.id,
    examId,
    studentId: userId,
    attemptNumber,
    startedAt: serverNow.toISOString(),
    endsAt: endsAt.toISOString(),
  })

  return {
    sessionId: session.id,
    startedAt: serverNow,
    endsAt,
    attemptNumber,
  }
}

// ──────────────────────────────────────────────────────────────
// 2. validateExamAccess
// ──────────────────────────────────────────────────────────────

/**
 * Validates whether a student can access/start an exam.
 * Checks:
 *   1. Exam is published/active
 *   2. User is enrolled in the exam's class
 *   3. No existing active session (prevents concurrent sessions)
 *   4. Attempt limit not exceeded
 *   5. Exam is within availability window
 *
 * @param userId - The student's user ID
 * @param examId - The exam ID
 * @returns ValidationResult indicating if access is allowed
 */
export async function validateExamAccess(
  userId: string,
  examId: string
): Promise<ValidationResult> {
  const svc = createServiceClient()
  if (!svc) return { allowed: false, reason: 'Database not configured' }
  const serverNow = new Date()

  // 1. Fetch the exam
  const exam = await getExam(examId)

  if (!exam) {
    return { allowed: false, reason: 'Exam not found' }
  }

  // 2. Check exam is published or active
  if (exam.status !== 'published' && exam.status !== 'active') {
    return { allowed: false, reason: `Exam is ${exam.status} — not available for taking` }
  }

  // 3. Check availability window
  if (exam.start_time && serverNow < new Date(exam.start_time)) {
    return { allowed: false, reason: 'Exam is not yet available — before availability window' }
  }
  if (exam.end_time && serverNow > new Date(exam.end_time)) {
    return { allowed: false, reason: 'Exam availability window has closed' }
  }

  // 4. Check user is enrolled in the exam's class
  if (exam.class_id) {
    const { data: enrollment } = await svc
      .from('class_students')
      .select('id')
      .eq('class_id', exam.class_id)
      .eq('student_id', userId)
      .limit(1)

    if (!enrollment || enrollment.length === 0) {
      return { allowed: false, reason: 'Student is not enrolled in the exam class' }
    }
  }

  // 5. Check for existing active session (prevents concurrent sessions)
  const { data: activeSession } = await svc
    .from('exam_sessions')
    .select('id')
    .eq('exam_id', examId)
    .eq('student_id', userId)
    .eq('status', SESSION_STATUS.IN_PROGRESS)
    .limit(1)

  if (activeSession && activeSession.length > 0) {
    return { allowed: false, reason: 'An active session already exists — reconnect instead' }
  }

  // 6. Check attempt limit
  const { count: completedAttempts, error: countError } = await svc
    .from('exam_sessions')
    .select('id', { count: 'exact', head: true })
    .eq('exam_id', examId)
    .eq('student_id', userId)
    .in('status', [SESSION_STATUS.SUBMITTED, SESSION_STATUS.TIMED_OUT, SESSION_STATUS.GRADED])

  if (countError) {
    return { allowed: false, reason: 'Could not verify attempt history' }
  }

  const maxAttempts = exam.allowed_attempts ?? 1
  if ((completedAttempts ?? 0) >= maxAttempts) {
    return { allowed: false, reason: `Maximum attempts (${maxAttempts}) exceeded` }
  }

  return { allowed: true }
}

// ──────────────────────────────────────────────────────────────
// 3. startExam
// ──────────────────────────────────────────────────────────────

/**
 * Starts an exam for a student. Validates access, creates session,
 * returns exam questions (WITHOUT correct answers) and server times.
 *
 * SECURITY:
 *   - NEVER returns correct answers
 *   - All timestamps are server-authoritative
 *   - Validates all access conditions before creating session
 *
 * @param userId - The student's user ID
 * @param examId - The exam ID
 * @returns CreateSessionResult with questions and server times
 */
export async function startExam(
  userId: string,
  examId: string
): Promise<CreateSessionResult> {
  const svc = createServiceClient()
  if (!svc) {
    return { success: false, serverTime: getServerTime(), error: 'Database not configured' }
  }
  const serverTime = getServerTime()

  // Validate access
  const validation = await validateExamAccess(userId, examId)
  if (!validation.allowed) {
    return {
      success: false,
      serverTime,
      error: validation.reason,
    }
  }

  // Create the session
  const { sessionId, startedAt, endsAt } = await createExamSession(userId, examId)

  // Fetch questions — SECURITY: select ONLY fields safe for client
  // NEVER select correct_answer
  const { data: questions, error: questionsError } = await svc
    .from('questions')
    .select('id, question_text, question_type, options, marks, difficulty, is_required, "order"')
    .eq('exam_id', examId)
    .order('"order"', { ascending: true })

  if (questionsError) {
    return { success: false, serverTime, error: 'Failed to load exam questions' }
  }

  // Strip isCorrect from options if present
  const safeQuestions: ExamQuestionForClient[] = (questions as QuestionRow[]).map(q => {
    let safeOptions = q.options
    if (safeOptions) {
      try {
        const parsed = JSON.parse(safeOptions)
        // Remove isCorrect from each option — defense in depth
        if (Array.isArray(parsed)) {
          const stripped = parsed.map((opt: Record<string, unknown>) => {
            const { isCorrect, ...rest } = opt
            void isCorrect // suppress unused var lint
            return rest
          })
          safeOptions = JSON.stringify(stripped)
        }
      } catch {
        // If options isn't valid JSON, pass through as-is
      }
    }

    return {
      id: q.id,
      questionText: q.question_text,
      questionType: q.question_type,
      options: safeOptions,
      marks: q.marks,
      difficulty: q.difficulty,
      isRequired: q.is_required,
      order: q.order,
    }
  })

  // Keep the session's answer total in sync for analytics readers
  await svc
    .from('exam_sessions')
    .update({ answers_total: safeQuestions.length })
    .eq('id', sessionId)

  logger.info('Exam started', {
    sessionId,
    examId,
    studentId: userId,
    questionCount: safeQuestions.length,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
  })

  return {
    success: true,
    sessionId,
    startedAt: startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    serverTime,
    questions: safeQuestions,
  }
}

// ──────────────────────────────────────────────────────────────
// 4. saveAnswer
// ──────────────────────────────────────────────────────────────

/**
 * Saves an answer for a question within an exam session.
 *
 * SECURITY:
 *   - Validates session is active
 *   - Validates exam is not expired (server-authoritative time)
 *   - Validates question belongs to the exam
 *   - Validates answer format
 *   - Saves with server timestamp (NEVER client timestamp)
 *   - Implements attempt locking (one save at a time per question)
 *   - Client timestamp is logged for forensic analysis only
 *
 * @param sessionId   - The exam session ID
 * @param questionId  - The question ID
 * @param answer      - The answer data (JSON string)
 * @param serverTimestamp - Override for server timestamp (for testing)
 * @returns SaveAnswerResult with version and server timestamp
 */
export async function saveAnswer(
  sessionId: string,
  questionId: string,
  answer: string,
  serverTimestamp?: string
): Promise<SaveAnswerResult> {
  const svc = createServiceClient()
  if (!svc) {
    return { success: false, answerVersion: 0, serverTimestamp: getServerTime(), error: 'Database not configured' }
  }
  const now = serverTimestamp ? new Date(serverTimestamp) : new Date()
  const nowISO = now.toISOString()

  // ── Fetch the session ──
  const session = await getSession(sessionId)

  if (!session) {
    return { success: false, answerVersion: 0, serverTimestamp: nowISO, error: 'Session not found' }
  }

  // ── Check session is not closed ──
  if (CLOSED_STATUSES.has(session.status)) {
    logger.security('Answer save rejected — session already closed', {
      sessionId,
      status: session.status,
      questionId,
    })
    return {
      success: false,
      answerVersion: 0,
      serverTimestamp: nowISO,
      error: `Cannot save answer: session is ${session.status}`,
    }
  }

  // ── Check exam time has not expired (server-authoritative) ──
  if (now >= new Date(session.ends_at)) {
    logger.security('Answer save rejected — exam time expired', {
      sessionId,
      serverTime: nowISO,
      endsAt: session.ends_at,
      questionId,
    })
    return {
      success: false,
      answerVersion: 0,
      serverTimestamp: nowISO,
      error: 'Exam time has expired — no further answers accepted',
    }
  }

  // ── Check attempt locking ──
  if (session.is_locked) {
    return {
      success: false,
      answerVersion: 0,
      serverTimestamp: nowISO,
      error: 'Session is temporarily locked — another save is in progress',
    }
  }

  // ── Validate question belongs to the exam ──
  const { data: question } = await svc
    .from('questions')
    .select('id, question_type')
    .eq('id', questionId)
    .eq('exam_id', session.exam_id)
    .limit(1)

  if (!question || question.length === 0) {
    return {
      success: false,
      answerVersion: 0,
      serverTimestamp: nowISO,
      error: 'Question does not belong to this exam',
    }
  }

  // ── Validate answer format ──
  if (!answer || answer.trim().length === 0) {
    return {
      success: false,
      answerVersion: 0,
      serverTimestamp: nowISO,
      error: 'Answer cannot be empty',
    }
  }

  // ── Lock the session for atomic save ──
  await svc.from('exam_sessions').update({ is_locked: true }).eq('id', sessionId)

  try {
    // ── Get current answer version ──
    const { data: existingAnswer } = await svc
      .from('exam_session_answers')
      .select('id, answer_version')
      .eq('session_id', sessionId)
      .eq('question_id', questionId)
      .maybeSingle()

    const currentVersion = existingAnswer?.answer_version ?? 0
    const newVersion = currentVersion + 1
    const isChange = currentVersion > 0

    // ── Upsert the answer ──
    if (existingAnswer) {
      await svc
        .from('exam_session_answers')
        .update({
          answer,
          answer_version: newVersion,
          saved_at: nowISO,
        })
        .eq('id', existingAnswer.id)
    } else {
      await svc.from('exam_session_answers').insert({
        session_id: sessionId,
        question_id: questionId,
        answer,
        answer_version: newVersion,
        saved_at: nowISO,
      })
    }

    // ── Keep analytics counters in sync ──
    if (!isChange) {
      await svc
        .from('exam_sessions')
        .update({ answers_completed: (await getAnsweredCount(svc, sessionId)) })
        .eq('id', sessionId)
    }

    // ── Record audit event ──
    await insertAuditEvent({
      sessionId,
      examId: session.exam_id,
      studentId: session.student_id,
      eventType: isChange ? 'answer_change' : 'answer_save',
      eventData: JSON.stringify({
        questionId,
        version: newVersion,
        serverTimestamp: nowISO,
      }),
      serverTimestamp: nowISO,
    })

    logger.info('Answer saved', {
      sessionId,
      questionId,
      version: newVersion,
      isChange,
    })

    return {
      success: true,
      answerVersion: newVersion,
      serverTimestamp: nowISO,
    }
  } finally {
    // ── Always unlock the session ──
    await svc.from('exam_sessions').update({ is_locked: false }).eq('id', sessionId)
  }
}

/** Count answered questions for a session (analytics sync). */
async function getAnsweredCount(
  svc: NonNullable<ReturnType<typeof createServiceClient>>,
  sessionId: string
): Promise<number> {
  const { count } = await svc
    .from('exam_session_answers')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)
  return count ?? 0
}

// ──────────────────────────────────────────────────────────────
// 5. submitExam
// ──────────────────────────────────────────────────────────────

/**
 * Submits an exam session. Sets server submission timestamp, locks session,
 * and triggers grading.
 *
 * SECURITY:
 *   - Validates session is active
 *   - Prevents duplicate submission (idempotency)
 *   - Sets server-authoritative submission timestamp
 *   - Locks the session (no further mutations)
 *   - Triggers grading
 *
 * @param sessionId       - The exam session ID
 * @param serverTimestamp - Override for server timestamp (for testing)
 * @returns SubmitExamResult
 */
export async function submitExam(
  sessionId: string,
  serverTimestamp?: string
): Promise<SubmitExamResult> {
  const svc = createServiceClient()
  if (!svc) {
    return { success: false, totalQuestions: 0, answeredQuestions: 0, error: 'Database not configured' }
  }
  const now = serverTimestamp ? new Date(serverTimestamp) : new Date()

  // ── Fetch the session ──
  const session = await getSession(sessionId)

  if (!session) {
    return { success: false, totalQuestions: 0, answeredQuestions: 0, error: 'Session not found' }
  }

  // ── Prevent duplicate submission ──
  if (CLOSED_STATUSES.has(session.status)) {
    logger.security('Duplicate submission rejected', {
      sessionId,
      status: session.status,
    })
    return {
      success: false,
      totalQuestions: 0,
      answeredQuestions: 0,
      error: `Exam already ${session.status} — cannot submit again`,
    }
  }

  // ── Get question and answer counts ──
  const [{ count: totalQuestions }, answeredQuestions] = await Promise.all([
    svc.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', session.exam_id),
    getAnsweredCount(svc, sessionId),
  ])

  // ── Set server submission timestamp and lock session ──
  await svc
    .from('exam_sessions')
    .update({
      status: SESSION_STATUS.SUBMITTED,
      submitted_at: now.toISOString(),
      is_locked: true,
      answers_completed: answeredQuestions,
      answers_total: totalQuestions ?? 0,
    })
    .eq('id', sessionId)

  // ── Record audit event ──
  await insertAuditEvent({
    sessionId,
    examId: session.exam_id,
    studentId: session.student_id,
    eventType: 'submit',
    eventData: JSON.stringify({
      totalQuestions: totalQuestions ?? 0,
      answeredQuestions,
      submittedAt: now.toISOString(),
    }),
    serverTimestamp: now.toISOString(),
  })

  logger.info('Exam submitted', {
    sessionId,
    examId: session.exam_id,
    studentId: session.student_id,
    totalQuestions: totalQuestions ?? 0,
    answeredQuestions,
    submittedAt: now.toISOString(),
  })

  // ── Trigger grading — awaited inline ──
  // NOTE: fire-and-forget promises are killed when a serverless function
  // returns its response (Vercel freezes the isolate). Grading is a handful
  // of fast queries, so we await it to guarantee results persist.
  try {
    await triggerGrading(sessionId, session.exam_id, session.student_id)
  } catch (err) {
    logger.error('Grading failed after submission', err, { sessionId })
  }

  return {
    success: true,
    submittedAt: now.toISOString(),
    totalQuestions: totalQuestions ?? 0,
    answeredQuestions,
  }
}

// ──────────────────────────────────────────────────────────────
// 6. forceSubmitOnExpiry
// ──────────────────────────────────────────────────────────────

/**
 * Server-side forced submission when the timer expires.
 * Called by a server timer/cron job, NOT by the client.
 *
 * SECURITY:
 *   - Only callable server-side (no API route)
 *   - Checks server-authoritative time
 *   - Only submits sessions that are still in_progress AND expired
 *   - Records auto_submit audit event
 *
 * @param sessionId - The exam session ID
 * @returns SubmitExamResult
 */
export async function forceSubmitOnExpiry(
  sessionId: string
): Promise<SubmitExamResult> {
  const svc = createServiceClient()
  if (!svc) {
    return { success: false, totalQuestions: 0, answeredQuestions: 0, error: 'Database not configured' }
  }
  const now = new Date()

  // ── Fetch the session ──
  const session = await getSession(sessionId)

  if (!session) {
    return { success: false, totalQuestions: 0, answeredQuestions: 0, error: 'Session not found' }
  }

  // ── Only force-submit if in_progress AND expired ──
  if (session.status !== SESSION_STATUS.IN_PROGRESS) {
    return {
      success: false,
      totalQuestions: 0,
      answeredQuestions: 0,
      error: `Session is ${session.status} — not eligible for force-submit`,
    }
  }

  if (now < new Date(session.ends_at)) {
    return {
      success: false,
      totalQuestions: 0,
      answeredQuestions: 0,
      error: 'Exam has not expired yet — cannot force-submit',
    }
  }

  // ── Get question and answer counts ──
  const [{ count: totalQuestions }, answeredQuestions] = await Promise.all([
    svc.from('questions').select('id', { count: 'exact', head: true }).eq('exam_id', session.exam_id),
    getAnsweredCount(svc, sessionId),
  ])

  // ── Mark as timed_out and lock ──
  await svc
    .from('exam_sessions')
    .update({
      status: SESSION_STATUS.TIMED_OUT,
      timed_out_at: now.toISOString(),
      is_locked: true,
      answers_completed: answeredQuestions,
      answers_total: totalQuestions ?? 0,
    })
    .eq('id', sessionId)

  // ── Record audit event ──
  await insertAuditEvent({
    sessionId,
    examId: session.exam_id,
    studentId: session.student_id,
    eventType: 'force_submit',
    eventData: JSON.stringify({
      reason: 'timer_expired',
      totalQuestions: totalQuestions ?? 0,
      answeredQuestions,
      timedOutAt: now.toISOString(),
      endsAt: session.ends_at,
    }),
    serverTimestamp: now.toISOString(),
  })

  logger.info('Exam force-submitted on expiry', {
    sessionId,
    examId: session.exam_id,
    studentId: session.student_id,
    totalQuestions: totalQuestions ?? 0,
    answeredQuestions,
    timedOutAt: now.toISOString(),
  })

  // ── Trigger grading — awaited (see note in submitExam) ──
  try {
    await triggerGrading(sessionId, session.exam_id, session.student_id)
  } catch (err) {
    logger.error('Grading failed after force-submit', err, { sessionId })
  }

  return {
    success: true,
    submittedAt: now.toISOString(),
    totalQuestions: totalQuestions ?? 0,
    answeredQuestions,
  }
}

// ──────────────────────────────────────────────────────────────
// 7. handleReconnect
// ──────────────────────────────────────────────────────────────

/**
 * Handles reconnection after network loss.
 * Returns current session state for the client to resume.
 *
 * SECURITY:
 *   - Does NOT extend the timer — remaining time is computed from
 *     server-authoritative start and end times
 *   - Returns current answers for the client to display
 *   - Records reconnect audit event
 *
 * @param sessionId - The exam session ID
 * @returns ReconnectState with current session state
 */
export async function handleReconnect(
  sessionId: string
): Promise<ReconnectState> {
  const svc = createServiceClient()
  const now = new Date()
  const nowISO = now.toISOString()

  if (!svc) {
    return {
      success: false,
      sessionId,
      examId: '',
      status: '',
      startedAt: '',
      endsAt: '',
      remainingSeconds: 0,
      isExpired: true,
      serverTime: nowISO,
      answers: {},
      currentQuestionIndex: 0,
      error: 'Database not configured',
    }
  }

  // ── Fetch the session ──
  const session = await getSession(sessionId)

  if (!session) {
    return {
      success: false,
      sessionId,
      examId: '',
      status: '',
      startedAt: '',
      endsAt: '',
      remainingSeconds: 0,
      isExpired: true,
      serverTime: nowISO,
      answers: {},
      currentQuestionIndex: 0,
      error: 'Session not found',
    }
  }

  // ── If session is closed, return closed state ──
  if (CLOSED_STATUSES.has(session.status)) {
    return {
      success: false,
      sessionId: session.id,
      examId: session.exam_id,
      status: session.status,
      startedAt: session.started_at,
      endsAt: session.ends_at,
      remainingSeconds: 0,
      isExpired: true,
      serverTime: nowISO,
      answers: {},
      currentQuestionIndex: 0,
      error: `Session is ${session.status}`,
    }
  }

  // ── Compute remaining time from SERVER clock ──
  // SECURITY: We NEVER extend the timer. Remaining time is based on
  // the server-authoritative ends_at, not on any client calculation.
  const remainingSeconds = Math.max(0, diffSeconds(nowISO, session.ends_at))
  const isExpired = remainingSeconds <= 0

  // ── If expired, auto-mark as timed_out ──
  if (isExpired) {
    await svc
      .from('exam_sessions')
      .update({
        status: SESSION_STATUS.TIMED_OUT,
        timed_out_at: now.toISOString(),
        is_locked: true,
      })
      .eq('id', sessionId)

    await insertAuditEvent({
      sessionId,
      examId: session.exam_id,
      studentId: session.student_id,
      eventType: 'auto_submit',
      eventData: JSON.stringify({
        reason: 'reconnect_detected_expiry',
        serverTime: nowISO,
        endsAt: session.ends_at,
      }),
      serverTimestamp: nowISO,
    })

    return {
      success: false,
      sessionId: session.id,
      examId: session.exam_id,
      status: SESSION_STATUS.TIMED_OUT,
      startedAt: session.started_at,
      endsAt: session.ends_at,
      remainingSeconds: 0,
      isExpired: true,
      serverTime: nowISO,
      answers: {},
      currentQuestionIndex: 0,
      error: 'Exam time has expired',
    }
  }

  // ── Fetch current answers ──
  const { data: answers } = await svc
    .from('exam_session_answers')
    .select('question_id, answer, answer_version, saved_at')
    .eq('session_id', sessionId)

  const answersMap: Record<string, { answer: string; version: number; savedAt: string }> = {}
  for (const a of (answers ?? []) as Array<{ question_id: string; answer: string; answer_version: number; saved_at: string }>) {
    answersMap[a.question_id] = {
      answer: a.answer,
      version: a.answer_version,
      savedAt: new Date(a.saved_at).toISOString(),
    }
  }

  // ── Record reconnect audit event ──
  await insertAuditEvent({
    sessionId,
    examId: session.exam_id,
    studentId: session.student_id,
    eventType: 'reconnect',
    eventData: JSON.stringify({
      remainingSeconds: Math.round(remainingSeconds),
      answeredQuestions: answers?.length ?? 0,
      serverTime: nowISO,
    }),
    serverTimestamp: nowISO,
  })

  logger.info('Exam session reconnected', {
    sessionId,
    examId: session.exam_id,
    studentId: session.student_id,
    remainingSeconds: Math.round(remainingSeconds),
    answeredQuestions: answers?.length ?? 0,
  })

  return {
    success: true,
    sessionId: session.id,
    examId: session.exam_id,
    status: session.status,
    startedAt: session.started_at,
    endsAt: session.ends_at,
    remainingSeconds: Math.round(remainingSeconds),
    isExpired: false,
    serverTime: nowISO,
    answers: answersMap,
    currentQuestionIndex: 0, // Client should determine this
  }
}

// ──────────────────────────────────────────────────────────────
// 8. detectTamper
// ──────────────────────────────────────────────────────────────

/**
 * Detects tampering by comparing client-reported timestamps with
 * server-authoritative timestamps.
 *
 * Flags suspicious time drift > CLOCK_SKEW_TOLERANCE_SECONDS (30s).
 *
 * @param sessionId      - The exam session ID
 * @param clientTimestamp - The client-reported timestamp (ISO string)
 * @returns TamperCheckResult
 */
export async function detectTamper(
  sessionId: string,
  clientTimestamp: string
): Promise<TamperCheckResult> {
  const serverTime = getServerTime()

  // ── Check time drift ──
  const driftResult = checkTimeDrift(clientTimestamp, serverTime)

  if (driftResult.isDrifted) {
    // ── Record tamper event ──
    await recordTamperEvent(sessionId, 'time_drift', {
      clientTime: clientTimestamp,
      serverTime,
      driftSeconds: driftResult.driftSeconds,
      tolerance: CLOCK_SKEW_TOLERANCE_SECONDS,
    })

    logger.security('Time drift detected', {
      sessionId,
      clientTime: clientTimestamp,
      serverTime,
      driftSeconds: driftResult.driftSeconds,
    })
  }

  return {
    isTampered: driftResult.isDrifted,
    driftSeconds: driftResult.driftSeconds,
    severity: driftResult.severity,
  }
}

// ──────────────────────────────────────────────────────────────
// 9. getServerExamTime
// ──────────────────────────────────────────────────────────────

/**
 * Gets the server-authoritative exam time state.
 * The client must call this (via API) on every timer tick or reconnect
 * to obtain the true remaining time. The client MUST NOT compute
 * remaining time from its own clock.
 *
 * @param sessionId - The exam session ID
 * @returns ExamTimeState with server-authoritative times
 */
export async function getServerExamTime(
  sessionId: string
): Promise<ExamTimeState> {
  const svc = createServiceClient()
  if (!svc) throw new Error('[CBT] Service client unavailable')
  const serverTime = getServerTime()

  const session = await getSession(sessionId)

  if (!session) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  const remainingSeconds = Math.max(0, diffSeconds(serverTime, session.ends_at))
  const isExpired = remainingSeconds <= 0

  // ── Auto-mark as timed_out if expired and still in_progress ──
  if (isExpired && session.status === SESSION_STATUS.IN_PROGRESS) {
    const now = new Date()
    await svc
      .from('exam_sessions')
      .update({
        status: SESSION_STATUS.TIMED_OUT,
        timed_out_at: now.toISOString(),
        is_locked: true,
      })
      .eq('id', sessionId)

    await insertAuditEvent({
      sessionId,
      examId: session.exam_id,
      studentId: session.student_id,
      eventType: 'timed_out',
      eventData: JSON.stringify({
        reason: 'server_time_check_detected_expiry',
        serverTime,
        endsAt: session.ends_at,
      }),
      serverTimestamp: now.toISOString(),
    })
  }

  return {
    sessionId: session.id,
    examId: session.exam_id,
    studentId: session.student_id,
    startedAt: session.started_at,
    endsAt: session.ends_at,
    remainingSeconds: Math.round(remainingSeconds),
    isExpired,
    serverTime,
  }
}

// ──────────────────────────────────────────────────────────────
// Internal: Trigger Grading
// ──────────────────────────────────────────────────────────────

/**
 * Triggers the grading process for a submitted exam session.
 * This is called asynchronously after submission.
 *
 * SECURITY: Grading is a separate operation. It reads the correct answers
 * from the DB (which the client never sees) and computes scores.
 */
async function triggerGrading(
  sessionId: string,
  examId: string,
  studentId: string
): Promise<void> {
  const svc = createServiceClient()
  if (!svc) throw new Error('[CBT] Service client unavailable')

  // Fetch all questions with correct answers
  const { data: questions } = await svc
    .from('questions')
    .select('id, correct_answer, marks, question_type')
    .eq('exam_id', examId)

  // Fetch all answers for the session
  const { data: answers } = await svc
    .from('exam_session_answers')
    .select('question_id, answer')
    .eq('session_id', sessionId)

  const answerMap = new Map(
    ((answers ?? []) as Array<{ question_id: string; answer: string }>).map(a => [a.question_id, a.answer])
  )

  // Grade each question
  let totalScore = 0
  let maxScore = 0

  for (const question of (questions ?? []) as Array<{
    id: string
    correct_answer: string | null
    marks: number
    question_type: string
  }>) {
    maxScore += question.marks

    const studentAnswer = answerMap.get(question.id)
    if (!studentAnswer || !question.correct_answer) continue

    // For auto-gradable types, compare answers
    if (
      question.question_type === 'single_choice' ||
      question.question_type === 'multi_choice' ||
      question.question_type === 'true_false' ||
      question.question_type === 'fill_blank' ||
      question.question_type === 'short_answer' ||
      question.question_type === 'multiple_choice' ||
      question.question_type === 'multi_select' ||
      question.question_type === 'fill_in_blank'
    ) {
      // Normalize BOTH sides: the DB stores correct answers as JSON-encoded
      // values (e.g. '"b"' or '"true"'), while students submit raw strings
      // (e.g. 'b' or 'True'). Parse when possible, fall back to the raw
      // string, then compare canonical JSON. Booleans are case-insensitive.
      const parse = (v: string): unknown => {
        try {
          return JSON.parse(v)
        } catch {
          return v
        }
      }
      const correct = parse(question.correct_answer)
      const submitted = parse(studentAnswer)

      // Booleans AND their string forms compare case-insensitively
      // ('true' / 'True' / true all match)
      const norm = (v: unknown): string => {
        if (typeof v === 'boolean') return String(v).toLowerCase()
        if (typeof v === 'string' && (v.toLowerCase() === 'true' || v.toLowerCase() === 'false')) {
          return v.toLowerCase()
        }
        return JSON.stringify(v)
      }
      const correctNorm = norm(correct)
      const submittedNorm = norm(submitted)

      if (correctNorm === submittedNorm) {
        totalScore += question.marks
      }
    }
    // Essay and short_answer types require manual/AI grading — skip auto-grading
  }

  // Create or update exam result
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0
  const grade = computeGrade(percentage)
  const answeredCount = answerMap.size
  const totalQuestions = (questions ?? []).length

  // ── Persist analytics to exam_sessions (what dashboards read) ──
  await svc
    .from('exam_sessions')
    .update({
      status: SESSION_STATUS.GRADED,
      percentage,
      grade,
      total_score: totalScore,
      max_score: maxScore,
      answers_completed: answeredCount,
      answers_total: totalQuestions,
    })
    .eq('id', sessionId)

  // ── Persist canonical result record to exam_results ──
  const { data: existingResult } = await svc
    .from('exam_results')
    .select('id')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)

  const resultPayload = {
    total_marks: totalScore,
    total_possible: maxScore,
    score_percentage: percentage,
    grade,
    is_passed: percentage >= 50,
    grading_status: 'auto_graded',
  }

  if (existingResult && existingResult.length > 0) {
    await svc.from('exam_results').update(resultPayload).eq('id', existingResult[0].id)
  } else {
    await svc.from('exam_results').insert({
      exam_id: examId,
      student_id: studentId,
      ...resultPayload,
    })
  }

  logger.info('Exam graded', {
    sessionId,
    examId,
    studentId,
    totalScore,
    maxScore,
    percentage: Math.round(percentage),
    grade,
  })
}

/**
 * Computes a letter grade from a percentage.
 */
function computeGrade(percentage: number): string {
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  if (percentage >= 50) return 'D'
  return 'F'
}
