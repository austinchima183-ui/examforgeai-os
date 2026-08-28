// ============================================================================
// ExamForge AI — Incidents API Route
// ============================================================================
// GET  /api/alerting/incidents  — List incidents (with filters)
// POST /api/alerting/incidents  — Create manual incident
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { createLogger } from '@/lib/observability/logger'
import { getIncidentHistory, getActiveIncidents, createManualIncident } from '@/lib/alerting/incident-manager'
import type { AlertCategory, IncidentFilters } from '@/lib/alerting/types'
import type { AlertSeverity } from '@/lib/observability/alerts'

const log = createLogger('api:alerting:incidents')

// ──────────────────────────────────────────────────────────────
// GET — List Incidents
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const { searchParams } = new URL(request.url)

    // Parse filters from query parameters
    const filters: IncidentFilters = {}

    const status = searchParams.get('status') as IncidentFilters['status'] | null
    if (status && ['firing', 'acknowledged', 'resolved'].includes(status)) {
      filters.status = status
    }

    const severity = searchParams.get('severity') as AlertSeverity | null
    if (severity && ['critical', 'warning', 'info'].includes(severity)) {
      filters.severity = severity
    }

    const category = searchParams.get('category') as AlertCategory | null
    if (category) {
      filters.category = category
    }

    const assigneeId = searchParams.get('assigneeId')
    if (assigneeId) {
      filters.assigneeId = assigneeId
    }

    const since = searchParams.get('since')
    if (since) {
      filters.since = since
    }

    const until = searchParams.get('until')
    if (until) {
      filters.until = until
    }

    const limit = searchParams.get('limit')
    if (limit) {
      filters.limit = Math.min(parseInt(limit, 10) || 100, 500)
    }

    const offset = searchParams.get('offset')
    if (offset) {
      filters.offset = parseInt(offset, 10) || 0
    }

    // If "active" query param is set, return only active incidents
    const activeOnly = searchParams.get('active') === 'true'
    let incidents
    if (activeOnly) {
      incidents = await getActiveIncidents()
    } else {
      incidents = await getIncidentHistory(filters)
    }

    return NextResponse.json({ incidents, error: null })
  } catch (error) {
    log.error('Failed to list incidents', error)
    return NextResponse.json(
      { incidents: [], error: 'Failed to list incidents' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// POST — Create Manual Incident
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
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json(
        { incident: null, error: 'title is required' },
        { status: 400 }
      )
    }

    if (!body.description || typeof body.description !== 'string') {
      return NextResponse.json(
        { incident: null, error: 'description is required' },
        { status: 400 }
      )
    }

    const validSeverities: AlertSeverity[] = ['critical', 'warning', 'info']
    const severity = body.severity as AlertSeverity
    if (!severity || !validSeverities.includes(severity)) {
      return NextResponse.json(
        { incident: null, error: 'severity must be one of: critical, warning, info' },
        { status: 400 }
      )
    }

    const validCategories: AlertCategory[] = [
      'api_failure', 'database_failure', 'ai_failure', 'payment_failure',
      'auth_failure', 'queue_failure', 'cbt_failure', 'high_latency',
      'high_error_rate', 'security',
    ]
    const category = body.category as AlertCategory
    if (!category || !validCategories.includes(category)) {
      return NextResponse.json(
        { incident: null, error: 'Invalid category' },
        { status: 400 }
      )
    }

    const incident = await createManualIncident({
      title: body.title,
      description: body.description,
      severity,
      category,
      assigneeId: body.assigneeId,
      metadata: body.metadata ?? {},
    })

    return NextResponse.json({ incident, error: null }, { status: 201 })
  } catch (error) {
    log.error('Failed to create incident', error)
    return NextResponse.json(
      { incident: null, error: 'Failed to create incident' },
      { status: 500 }
    )
  }
}
