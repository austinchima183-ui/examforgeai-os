// ============ ExamForge AI — Import Errors API ============
// GET /api/import/errors?sessionId=xxx
// Download a CSV file containing all failed/import-error rows.
// Auth required: school_admin or super_admin only.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createLogger } from '@/lib/observability/logger'
import { exportErrors, getSession } from '@/lib/import/import-engine'

const log = createLogger('api:import:errors')

// ──────────────────────────────────────────────────────────────
// GET Handler
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Auth check
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  if (auth.user.role !== 'school_admin' && auth.user.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 },
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId query parameter is required' },
        { status: 400 },
      )
    }

    // Verify session exists and belongs to user's school
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

    // Export errors as CSV
    const csvBuffer = exportErrors(sessionId)

    if (csvBuffer.length === 0) {
      return NextResponse.json(
        { error: 'No errors to export' },
        { status: 404 },
      )
    }

    // Return CSV file as downloadable response
    return new NextResponse(new Uint8Array(csvBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="import-errors-${sessionId}.csv"`,
        'Content-Length': String(csvBuffer.length),
      },
    })
  } catch (err) {
    log.error('Failed to export import errors', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to export errors' },
      { status: 500 },
    )
  }
}
