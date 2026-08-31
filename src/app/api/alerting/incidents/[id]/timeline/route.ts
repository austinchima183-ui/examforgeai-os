// ============================================================================
// ExamForge AI — Incident Timeline API Route
// ============================================================================
// GET /api/alerting/incidents/[id]/timeline — Get timeline events
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/observability/logger'
import { getIncidentTimeline, getIncident } from '@/lib/alerting/incident-manager'
import { requireApiRole } from '@/lib/api/auth-guard'

const log = createLogger('api:alerting:incidents:id:timeline')

// ──────────────────────────────────────────────────────────────
// GET — Get Incident Timeline (admin-gated: operational security data)
// ──────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // ── Role guard (Ω-17: consistent with all sibling alerting routes) ──
    const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Verify incident exists
    const incident = await getIncident(id)
    if (!incident) {
      return NextResponse.json(
        { timeline: null, error: 'Incident not found' },
        { status: 404 }
      )
    }

    const timeline = await getIncidentTimeline(id)

    return NextResponse.json({
      timeline: timeline ?? { incidentId: id, events: [] },
      error: null,
    })
  } catch (error) {
    log.error('Failed to get incident timeline', error)
    return NextResponse.json(
      { timeline: null, error: 'Failed to get timeline' },
      { status: 500 }
    )
  }
}
