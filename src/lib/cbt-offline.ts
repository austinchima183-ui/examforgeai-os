// ============================================================================
// ExamForge AI — CBT Offline Service
// ============================================================================
// Robust offline support for CBT examinations:
// - IndexedDB persistence via Dexie for answers, exam state, and session data
// - Automatic synchronization when connectivity returns
// - Conflict handling (server wins for submitted, local wins for in-progress)
// - Exam recovery after connectivity loss or page crash
// ============================================================================
// FIXES: Never lose a student's answer because of temporary connectivity loss.
// ============================================================================

import Dexie, { type EntityTable } from 'dexie'
import { logger } from '@/lib/utils/logger'

// ──────────────────────────────────────────────────────────────
// IndexedDB Schema
// ──────────────────────────────────────────────────────────────

interface OfflineExamSession {
  id: string // Same as server session ID
  examId: string
  studentId: string
  schoolId: string
  startedAt: number
  lastSyncedAt: number
  serverState: 'in_progress' | 'submitted' | 'timed_out'
  /** Total time elapsed in seconds (tracked locally) */
  elapsedSeconds: number
  /** Whether the session has been recovered after a crash */
  recovered: boolean
}

interface OfflineAnswer {
  id: string // Composite: `${examSessionId}:${questionId}`
  examSessionId: string
  questionId: string
  answer: string | string[] | null
  answeredAt: number
  syncedToServer: boolean
  /** Version counter for conflict detection */
  version: number
}

interface OfflineExamState {
  id: string // Same as exam ID
  examData: {
    title: string
    durationMinutes: number
    totalQuestions: number
    questions: Array<{
      id: string
      type: string
      content: string
      options?: string[]
      marks: number
    }>
  }
  downloadedAt: number
  expiresAt: number
}

interface SyncQueueEntry {
  id?: number // Auto-increment
  type: 'answer_save' | 'session_update' | 'session_submit'
  payload: Record<string, unknown>
  createdAt: number
  retryCount: number
  lastAttemptAt: number | null
  status: 'pending' | 'in_progress' | 'failed' | 'completed'
}

// ──────────────────────────────────────────────────────────────
// Database
// ──────────────────────────────────────────────────────────────

class ExamForgeOfflineDB extends Dexie {
  examSessions!: EntityTable<OfflineExamSession, 'id'>
  answers!: EntityTable<OfflineAnswer, 'id'>
  examState!: EntityTable<OfflineExamState, 'id'>
  syncQueue!: EntityTable<SyncQueueEntry, 'id'>

  constructor() {
    super('ExamForgeOffline')
    this.version(1).stores({
      examSessions: 'id, examId, studentId, schoolId, lastSyncedAt',
      answers: 'id, examSessionId, questionId, syncedToServer, [examSessionId+questionId]',
      examState: 'id, expiresAt',
      syncQueue: '++id, type, status, createdAt',
    })
  }
}

let dbInstance: ExamForgeOfflineDB | null = null

function getDB(): ExamForgeOfflineDB {
  if (!dbInstance) {
    dbInstance = new ExamForgeOfflineDB()
  }
  return dbInstance
}

// ──────────────────────────────────────────────────────────────
// Exam Session Management
// ──────────────────────────────────────────────────────────────

/**
 * Save an exam session to offline storage.
 * Called when a student starts an exam.
 */
export async function saveOfflineExamSession(
  session: OfflineExamSession
): Promise<void> {
  const db = getDB()
  await db.examSessions.put(session)
  logger.info('Exam session saved offline', {
    examId: session.examId,
    sessionId: session.id,
  })
}

/**
 * Get an offline exam session.
 */
export async function getOfflineExamSession(
  sessionId: string
): Promise<OfflineExamSession | undefined> {
  const db = getDB()
  return db.examSessions.get(sessionId)
}

/**
 * Update the elapsed time for an offline exam session.
 */
export async function updateOfflineExamTimer(
  sessionId: string,
  elapsedSeconds: number
): Promise<void> {
  const db = getDB()
  await db.examSessions.update(sessionId, { elapsedSeconds })
}

/**
 * Recover an exam session after a crash or connectivity loss.
 * Returns the session with the latest answers.
 */
export async function recoverExamSession(
  sessionId: string
): Promise<{
  session: OfflineExamSession
  answers: OfflineAnswer[]
} | null> {
  const db = getDB()
  const session = await db.examSessions.get(sessionId)

  if (!session) return null

  // Mark as recovered
  await db.examSessions.update(sessionId, { recovered: true })

  // Get all answers for this session
  const answers = await db.answers
    .where('examSessionId')
    .equals(sessionId)
    .toArray()

  logger.info('Exam session recovered offline', {
    examId: session.examId,
    sessionId,
    answerCount: answers.length,
    elapsedSeconds: session.elapsedSeconds,
  })

  return { session, answers }
}

// ──────────────────────────────────────────────────────────────
// Answer Management
// ──────────────────────────────────────────────────────────────

/**
 * Save an answer to offline storage.
 * This is the critical path — MUST succeed even if offline.
 */
export async function saveOfflineAnswer(
  examSessionId: string,
  questionId: string,
  answer: string | string[] | null
): Promise<void> {
  const db = getDB()
  const id = `${examSessionId}:${questionId}`

  // Get existing answer for version increment
  const existing = await db.answers.get(id)
  const version = existing ? existing.version + 1 : 1

  const offlineAnswer: OfflineAnswer = {
    id,
    examSessionId,
    questionId,
    answer,
    answeredAt: Date.now(),
    syncedToServer: false,
    version,
  }

  await db.answers.put(offlineAnswer)

  // Add to sync queue
  await db.syncQueue.add({
    type: 'answer_save',
    payload: {
      examSessionId,
      questionId,
      answer,
      version,
    },
    createdAt: Date.now(),
    retryCount: 0,
    lastAttemptAt: null,
    status: 'pending',
  })

  logger.info('Answer saved offline', {
    examSessionId,
    questionId,
    version,
    syncedToServer: false,
  })
}

/**
 * Get all unsynced answers for a session.
 */
export async function getUnsyncedAnswers(
  examSessionId: string
): Promise<OfflineAnswer[]> {
  const db = getDB()
  return db.answers
    .where('examSessionId')
    .equals(examSessionId)
    .and(a => !a.syncedToServer)
    .toArray()
}

/**
 * Mark an answer as synced to server.
 */
export async function markAnswerSynced(
  examSessionId: string,
  questionId: string
): Promise<void> {
  const db = getDB()
  const id = `${examSessionId}:${questionId}`
  await db.answers.update(id, { syncedToServer: true })
}

/**
 * Get all answers for an exam session.
 */
export async function getSessionAnswers(
  examSessionId: string
): Promise<OfflineAnswer[]> {
  const db = getDB()
  return db.answers
    .where('examSessionId')
    .equals(examSessionId)
    .toArray()
}

// ──────────────────────────────────────────────────────────────
// Exam Data Caching (for offline access)
// ──────────────────────────────────────────────────────────────

/**
 * Cache exam data for offline access.
 * Called when an exam is loaded while online.
 */
export async function cacheExamOffline(
  examId: string,
  examData: OfflineExamState['examData']
): Promise<void> {
  const db = getDB()
  const durationMs = examData.durationMinutes * 60 * 1000

  await db.examState.put({
    id: examId,
    examData,
    downloadedAt: Date.now(),
    expiresAt: Date.now() + durationMs + 30 * 60 * 1000, // Exam duration + 30 min buffer
  })
}

/**
 * Get cached exam data for offline access.
 */
export async function getCachedExam(
  examId: string
): Promise<OfflineExamState['examData'] | null> {
  const db = getDB()
  const cached = await db.examState.get(examId)

  if (!cached) return null
  if (Date.now() > cached.expiresAt) {
    await db.examState.delete(examId)
    return null
  }

  return cached.examData
}

// ──────────────────────────────────────────────────────────────
// Sync Queue Management
// ──────────────────────────────────────────────────────────────

/**
 * Add a session submission to the sync queue.
 */
export async function queueSessionSubmission(
  examSessionId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const db = getDB()
  await db.syncQueue.add({
    type: 'session_submit',
    payload: { examSessionId, ...payload },
    createdAt: Date.now(),
    retryCount: 0,
    lastAttemptAt: null,
    status: 'pending',
  })
}

/**
 * Get pending sync entries.
 */
export async function getPendingSyncEntries(): Promise<SyncQueueEntry[]> {
  const db = getDB()
  return db.syncQueue
    .where('status')
    .equals('pending')
    .toArray()
}

/**
 * Update sync entry status.
 */
export async function updateSyncEntry(
  id: number,
  updates: Partial<SyncQueueEntry>
): Promise<void> {
  const db = getDB()
  await db.syncQueue.update(id, updates)
}

/**
 * Process the sync queue — attempt to send all pending entries to the server.
 * Called when connectivity is restored.
 */
export async function processSyncQueue(): Promise<{
  processed: number
  failed: number
  remaining: number
}> {
  const db = getDB()
  const pending = await getPendingSyncEntries()
  let processed = 0
  let failed = 0

  for (const entry of pending) {
    if (entry.retryCount >= 5) {
      await updateSyncEntry(entry.id!, { status: 'failed' })
      failed++
      continue
    }

    try {
      await updateSyncEntry(entry.id!, { status: 'in_progress', lastAttemptAt: Date.now() })

      // Attempt to sync based on type
      const success = await syncEntryToServer(entry)

      if (success) {
        await updateSyncEntry(entry.id!, { status: 'completed' })
        processed++
      } else {
        await updateSyncEntry(entry.id!, {
          status: 'pending',
          retryCount: entry.retryCount + 1,
        })
        failed++
      }
    } catch (error) {
      await updateSyncEntry(entry.id!, {
        status: 'pending',
        retryCount: entry.retryCount + 1,
      })
      failed++
      logger.error('Sync queue entry failed', error, { entryId: entry.id, type: entry.type })
    }
  }

  const remaining = (await getPendingSyncEntries()).length

  logger.info('Sync queue processed', { processed, failed, remaining })

  return { processed, failed, remaining }
}

/**
 * Sync a single entry to the server.
 */
async function syncEntryToServer(entry: SyncQueueEntry): Promise<boolean> {
  try {
    const { examSessionId, questionId, answer } = entry.payload as {
      examSessionId: string
      questionId?: string
      answer?: string | string[] | null
    }

    if (entry.type === 'answer_save' && questionId) {
      const response = await fetch('/api/cbt/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examSessionId, questionId, answer }),
      })

      if (response.ok) {
        await markAnswerSynced(examSessionId, questionId)
        return true
      }
      return false
    }

    if (entry.type === 'session_submit') {
      const response = await fetch('/api/cbt/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.payload),
      })
      return response.ok
    }

    if (entry.type === 'session_update') {
      const response = await fetch('/api/cbt/timing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.payload),
      })
      return response.ok
    }

    return true
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Offline Detection
// ──────────────────────────────────────────────────────────────

let isOffline = false
const offlineListeners = new Set<(offline: boolean) => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOffline = false
    for (const listener of offlineListeners) listener(false)
    // Process sync queue when coming back online
    processSyncQueue().catch(err => {
      logger.error('Auto-sync failed on reconnect', err)
    })
  })

  window.addEventListener('offline', () => {
    isOffline = true
    for (const listener of offlineListeners) listener(true)
  })
}

/**
 * Check if currently offline.
 */
export function isCurrentlyOffline(): boolean {
  if (typeof navigator !== 'undefined') {
    return !navigator.onLine
  }
  return isOffline
}

/**
 * Subscribe to offline/online status changes.
 */
export function onOfflineChange(
  listener: (offline: boolean) => void
): () => void {
  offlineListeners.add(listener)
  return () => offlineListeners.delete(listener)
}

// ──────────────────────────────────────────────────────────────
// Conflict Resolution
// ──────────────────────────────────────────────────────────────

/**
 * Resolve a conflict between local and server answers.
 * Strategy: For in-progress exams, the latest answer wins (by timestamp).
 * For submitted exams, the server answer always wins.
 */
export function resolveAnswerConflict(
  localAnswer: OfflineAnswer,
  serverAnswer: { answer: string | string[] | null; updatedAt: number }
): {
  winner: 'local' | 'server'
  answer: string | string[] | null
} {
  // If the exam is already submitted, server always wins
  // This is handled at the session level — individual answers
  // in an in-progress exam use latest-wins

  if (localAnswer.answeredAt > serverAnswer.updatedAt) {
    return { winner: 'local', answer: localAnswer.answer }
  }

  return { winner: 'server', answer: serverAnswer.answer }
}

// ──────────────────────────────────────────────────────────────
// Cleanup
// ──────────────────────────────────────────────────────────────

/**
 * Clean up expired offline data.
 */
export async function cleanupOfflineData(): Promise<void> {
  const db = getDB()
  const now = Date.now()

  // Remove expired exam states
  await db.examState
    .where('expiresAt')
    .below(now)
    .delete()

  // Remove completed sync entries older than 1 hour
  const oneHourAgo = now - 60 * 60 * 1000
  await db.syncQueue
    .where('status')
    .equals('completed')
    .filter(e => e.createdAt < oneHourAgo)
    .delete()
}
