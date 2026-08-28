import { NextResponse } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge AI — Marketing Analytics API Route
// ============================================================================
// GET /api/marketing/analytics — Fetch analytics aggregations
// ============================================================================

export async function GET() {
  try {
    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json(
        { eventsByType: {}, topPages: {}, sourceDistribution: {}, totalEvents: 0, error: error.message },
        { status: 500 }
      )
    }

    // Aggregate
    const eventsByType: Record<string, number> = {}
    const topPages: Record<string, number> = {}
    const sourceDistribution: Record<string, number> = {}

    for (const event of events || []) {
      // By type
      eventsByType[event.event_name] = (eventsByType[event.event_name] || 0) + 1

      // By page
      if (event.page_url) {
        try {
          const url = new URL(event.page_url)
          const path = url.pathname
          topPages[path] = (topPages[path] || 0) + 1
        } catch {
          topPages[event.page_url] = (topPages[event.page_url] || 0) + 1
        }
      }

      // By source
      if (event.utm_source) {
        sourceDistribution[event.utm_source] = (sourceDistribution[event.utm_source] || 0) + 1
      }
    }

    return NextResponse.json({
      eventsByType,
      topPages,
      sourceDistribution,
      totalEvents: (events || []).length,
    })
  } catch (err) {
    return NextResponse.json(
      {
        eventsByType: {},
        topPages: {},
        sourceDistribution: {},
        totalEvents: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
