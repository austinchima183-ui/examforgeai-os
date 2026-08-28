// ============================================================================
// ExamForge AI — Incident Timeline API Route
// ============================================================================
// GET /api/alerting/incidents/[id]/timeline — Get timeline events
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/observability/logger'
import { getIncidentTimeline, getIncident } from '@/lib/alerting/incident-manager'

const log = createLogger('api:alerting:incidents:id:timeline')

// ──────────────────────────────────────────────────────────────
// GET — Get Incident Timeline
// ──────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
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
