// ============================================================================
// ExamForge AI — Single Incident API Route
// ============================================================================
// GET    /api/alerting/incidents/[id]  — Get incident with timeline
// PATCH  /api/alerting/incidents/[id]  — Acknowledge/resolve/assign
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { createLogger } from '@/lib/observability/logger'
import {
  getIncident,
  getIncidentTimeline,
  acknowledgeIncident,
  resolveIncident,
  assignIncident,
} from '@/lib/alerting/incident-manager'

const log = createLogger('api:alerting:incidents:id')

// ──────────────────────────────────────────────────────────────
// GET — Get Incident with Timeline
// ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const { id } = await params
    const incident = await getIncident(id)

    if (!incident) {
      return NextResponse.json(
        { incident: null, error: 'Incident not found' },
        { status: 404 }
      )
    }

    const timeline = await getIncidentTimeline(id)

    return NextResponse.json({
      incident,
      timeline: timeline ?? { incidentId: id, events: [] },
      error: null,
    })
  } catch (error) {
    log.error('Failed to get incident', error)
    return NextResponse.json(
      { incident: null, error: 'Failed to get incident' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// PATCH — Acknowledge / Resolve / Assign
// ──────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const { id } = await params
    const body = await request.json()
    const { action, userId } = body

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    let result: { error: string | null }

    switch (action) {
      case 'acknowledge':
        result = await acknowledgeIncident(id, userId)
        break

      case 'resolve':
        result = await resolveIncident(id, userId)
        break

      case 'assign':
        if (!body.assigneeId || typeof body.assigneeId !== 'string') {
          return NextResponse.json(
            { error: 'assigneeId is required for assign action' },
            { status: 400 }
          )
        }
        result = await assignIncident(id, body.assigneeId)
        break

      default:
        return NextResponse.json(
          { error: 'action must be one of: acknowledge, resolve, assign' },
          { status: 400 }
        )
    }

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Return updated incident
    const updatedIncident = await getIncident(id)
    return NextResponse.json({ incident: updatedIncident, error: null })
  } catch (error) {
    log.error('Failed to update incident', error)
    return NextResponse.json(
      { error: 'Failed to update incident' },
      { status: 500 }
    )
  }
}
