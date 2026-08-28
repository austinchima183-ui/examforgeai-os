// ============ ExamForge AI — Import Progress API ============
// GET /api/import/progress?sessionId=xxx
// Get import progress for polling. Returns current status,
// percentage, batch info, and estimated time remaining.
// Auth required: school_admin or super_admin only.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createLogger } from '@/lib/observability/logger'
import { getImportProgress, getSession } from '@/lib/import/import-engine'

const log = createLogger('api:import:progress')

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

    // Get progress
    const progress = getImportProgress(sessionId)

    return NextResponse.json({ data: progress })
  } catch (err) {
    log.error('Failed to get import progress', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get progress' },
      { status: 500 },
    )
  }
}
