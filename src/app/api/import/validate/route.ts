// ============ ExamForge AI — Import Validate API ============
// POST /api/import/validate
// Run validation on an uploaded file with optional column mapping.
// Auth required: school_admin or super_admin only.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createLogger } from '@/lib/observability/logger'
import { validateImport, getSession, updateSessionMapping } from '@/lib/import/import-engine'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const log = createLogger('api:import:validate')

// ──────────────────────────────────────────────────────────────
// Request Validation Schema
// ──────────────────────────────────────────────────────────────

const ValidateRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  mapping: z.array(
    z.object({
      sourceColumn: z.string(),
      targetField: z.string(),
    }),
  ).optional(),
})

// ──────────────────────────────────────────────────────────────
// POST Handler
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  if (auth.user.role !== 'school_admin' && auth.user.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 },
    )
  }

  try {
    const body = await request.json()
    const parsed = ValidateRequestSchema.safeParse(body)

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

    const { sessionId, mapping } = parsed.data

    // Verify session exists and belongs to this user's school
    const session = getSession(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Import session not found' },
        { status: 404 },
      )
    }

    if (session.schoolId !== auth.user.schoolId && auth.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Access denied — session belongs to a different school' },
        { status: 403 },
      )
    }

    // Update mapping if provided
    if (mapping && mapping.length > 0) {
      updateSessionMapping(sessionId, mapping)
    }

    // Run validation
    const result = await validateImport(sessionId)

    log.info('Import validation requested', {
      sessionId,
      userId: auth.user.id,
      validRows: result.validRows,
      invalidRows: result.invalidRows,
    })

    return NextResponse.json({ data: result })
  } catch (err) {
    log.error('Import validation failed', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Validation failed' },
      { status: 500 },
    )
  }
}
