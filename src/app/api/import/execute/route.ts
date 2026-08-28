// ============ ExamForge AI — Import Execute API ============
// POST /api/import/execute — Start import execution
// PATCH /api/import/execute — Pause / Resume / Cancel / Rollback
// Auth required: school_admin or super_admin only.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createLogger } from '@/lib/observability/logger'
import {
  executeImport,
  rollbackImport,
  resumeImport,
  getSession,
  updateSessionStatus,
} from '@/lib/import/import-engine'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const log = createLogger('api:import:execute')

// ──────────────────────────────────────────────────────────────
// Request Schemas
// ──────────────────────────────────────────────────────────────

const ExecuteRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  duplicateStrategy: z.enum(['skip', 'update', 'error']).default('skip'),
  skipInvalidRows: z.boolean().default(true),
  batchSize: z.number().int().min(1).max(500).optional(),
})

const PatchRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  action: z.enum(['pause', 'resume', 'cancel', 'rollback']),
})

// ──────────────────────────────────────────────────────────────
// Auth & Session Helpers
// ──────────────────────────────────────────────────────────────

async function checkAuth() {
  const auth = await getAuthUser()
  if (!auth) return null
  if (auth.user.role !== 'school_admin' && auth.user.role !== 'super_admin') return null
  return auth
}

function verifySessionOwnership(
  session: ReturnType<typeof getSession>,
  schoolId: string | null,
  isSuperAdmin: boolean,
): NextResponse | null {
  if (!session) {
    return NextResponse.json({ error: 'Import session not found' }, { status: 404 })
  }
  if (session!.schoolId !== schoolId && !isSuperAdmin) {
    return NextResponse.json(
      { error: 'Access denied — session belongs to a different school' },
      { status: 403 },
    )
  }
  return null // No error
}

// ──────────────────────────────────────────────────────────────
// POST — Execute Import
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await checkAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const body = await request.json()
    const parsed = ExecuteRequestSchema.safeParse(body)

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.') || '_root'
        if (!fieldErrors[field]) fieldErrors[field] = []
        fieldErrors[field].push(issue.message)
      }
      return NextResponse.json(
        { error: 'Validation failed', fields: fieldErrors },
        { status: 400 },
      )
    }

    const { sessionId, duplicateStrategy, skipInvalidRows, batchSize } = parsed.data

    // Verify session
    const session = getSession(sessionId)
    const ownershipError = verifySessionOwnership(session, auth.user.schoolId, auth.user.role === 'super_admin')
    if (ownershipError) return ownershipError

    // Execute import
    const result = await executeImport(sessionId, {
      duplicateStrategy,
      skipInvalidRows,
      batchSize,
    })

    log.info('Import execution completed', {
      sessionId,
      status: result.importedRows > 0 ? 'success' : 'failed',
      imported: result.importedRows,
      skipped: result.skippedRows,
      failed: result.failedRows,
      durationMs: result.duration,
    })

    return NextResponse.json({ data: result })
  } catch (err) {
    log.error('Import execution failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Execution failed' },
      { status: 500 },
    )
  }
}

// ──────────────────────────────────────────────────────────────
// PATCH — Pause / Resume / Cancel / Rollback
// ──────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  const auth = await checkAuth()
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const body = await request.json()
    const parsed = PatchRequestSchema.safeParse(body)

    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.') || '_root'
        if (!fieldErrors[field]) fieldErrors[field] = []
        fieldErrors[field].push(issue.message)
      }
      return NextResponse.json(
        { error: 'Validation failed', fields: fieldErrors },
        { status: 400 },
      )
    }

    const { sessionId, action } = parsed.data

    // Verify session
    const session = getSession(sessionId)
    const ownershipError = verifySessionOwnership(session, auth.user.schoolId, auth.user.role === 'super_admin')
    if (ownershipError) return ownershipError

    switch (action) {
      case 'pause': {
        // Mark as pending (paused) — execution will check status
        updateSessionStatus(sessionId, 'pending')
        log.info('Import paused', { sessionId })
        return NextResponse.json({ data: { status: 'paused' } })
      }

      case 'resume': {
        const result = await resumeImport(sessionId)
        log.info('Import resumed and completed', { sessionId })
        return NextResponse.json({ data: result })
      }

      case 'cancel': {
        updateSessionStatus(sessionId, 'failed')
        log.info('Import cancelled', { sessionId })
        return NextResponse.json({ data: { status: 'cancelled' } })
      }

      case 'rollback': {
        await rollbackImport(sessionId)
        log.info('Import rolled back', { sessionId })
        return NextResponse.json({ data: { status: 'rolled_back' } })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (err) {
    log.error('Import action failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Action failed' },
      { status: 500 },
    )
  }
}
