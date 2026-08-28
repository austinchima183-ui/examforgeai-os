// ============================================================================
// ExamForge AI — Suppressions API Route
// ============================================================================
// GET    /api/alerting/suppressions  — List active suppressions
// POST   /api/alerting/suppressions  — Create suppression
// DELETE /api/alerting/suppressions  — Remove suppression
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { createLogger } from '@/lib/observability/logger'
import {
  getActiveSuppressions,
  suppressAlert,
  removeSuppression,
  removeSuppressionById,
} from '@/lib/alerting/suppression'
import type { AlertCategory } from '@/lib/alerting/types'

const log = createLogger('api:alerting:suppressions')

const VALID_CATEGORIES: AlertCategory[] = [
  'api_failure', 'database_failure', 'ai_failure', 'payment_failure',
  'auth_failure', 'queue_failure', 'cbt_failure', 'high_latency',
  'high_error_rate', 'security',
]

// ──────────────────────────────────────────────────────────────
// GET — List Active Suppressions
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const suppressions = await getActiveSuppressions()

    return NextResponse.json({ suppressions, error: null })
  } catch (error) {
    log.error('Failed to list suppressions', error)
    return NextResponse.json(
      { suppressions: [], error: 'Failed to list suppressions' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// POST — Create Suppression
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.ruleName || typeof body.ruleName !== 'string') {
      return NextResponse.json(
        { suppression: null, error: 'ruleName is required' },
        { status: 400 }
      )
    }

    const category = body.category as AlertCategory
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { suppression: null, error: 'Invalid category' },
        { status: 400 }
      )
    }

    if (typeof body.durationMinutes !== 'number' || body.durationMinutes < 0) {
      return NextResponse.json(
        { suppression: null, error: 'durationMinutes must be a non-negative number' },
        { status: 400 }
      )
    }

    if (!body.reason || typeof body.reason !== 'string') {
      return NextResponse.json(
        { suppression: null, error: 'reason is required' },
        { status: 400 }
      )
    }

    const suppression = await suppressAlert(
      body.ruleName,
      category,
      body.durationMinutes,
      body.reason,
      body.suppressedBy ?? null
    )

    return NextResponse.json({ suppression, error: null }, { status: 201 })
  } catch (error) {
    log.error('Failed to create suppression', error)
    return NextResponse.json(
      { suppression: null, error: 'Failed to create suppression' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE — Remove Suppression
// ──────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const { searchParams } = new URL(request.url)
    const ruleName = searchParams.get('ruleName')
    const suppressionId = searchParams.get('id')

    if (!ruleName && !suppressionId) {
      return NextResponse.json(
        { error: 'Either ruleName or id query parameter is required' },
        { status: 400 }
      )
    }

    let removed: boolean

    if (suppressionId) {
      removed = await removeSuppressionById(suppressionId)
    } else {
      removed = await removeSuppression(ruleName!)
    }

    if (!removed) {
      return NextResponse.json(
        { error: 'Suppression not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ error: null })
  } catch (error) {
    log.error('Failed to remove suppression', error)
    return NextResponse.json(
      { error: 'Failed to remove suppression' },
      { status: 500 }
    )
  }
}
