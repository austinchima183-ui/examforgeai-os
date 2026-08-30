import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { getEventHistory, getEventStatistics } from '@/lib/event-bus/event-replay'
import { eventBus } from '@/lib/event-bus/event-emitter'
import type { EventHistoryFilters } from '@/lib/event-bus/types'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { eventCreateSchema, eventQuerySchema } from '@/lib/validators/api-schemas'
import { EventType } from '@/lib/event-bus/types'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// GET /api/events — Get event history with filters
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user } } = await supabase.auth.getUser()
    const userRole = (user?.app_metadata?.role as string) ?? 'student'
    const allowedRoles = ['super_admin', 'school_admin']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const queryObj = Object.fromEntries(searchParams.entries())
    const queryResult = validateInput(eventQuerySchema, queryObj)
    if ('error' in queryResult) return queryResult.error
    const eventType = queryResult.data.type
    const organizationId = queryResult.data.schoolId ?? auth.user.schoolId ?? ''
    const startDate = queryResult.data.fromTimestamp
    const endDate = queryResult.data.toTimestamp
    const page = queryResult.data.page ?? 1
    const limit = queryResult.data.limit ?? 50

    const filters: EventHistoryFilters = {
      sourceOrgId: organizationId,
      limit,
      offset: (page - 1) * limit,
    }
    if (eventType) filters.eventType = eventType as EventType
    if (startDate) filters.fromTimestamp = startDate
    if (endDate) filters.toTimestamp = endDate

    const [historyData, statsData] = await Promise.all([
      getEventHistory(filters),
      getEventStatistics({ schoolId: organizationId }),
    ])

    return NextResponse.json({
      events: historyData.events,
      stats: statsData,
      page,
      limit,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch event history', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/events — Publish event
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── CSRF guard (Mission Ω-7 hardening) ───
    const csrfResult = enforceCsrf(req, auth)
    if (csrfResult) return csrfResult

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user } } = await supabase.auth.getUser()
    const userRole = (user?.app_metadata?.role as string) ?? 'student'
    const allowedRoles = ['super_admin', 'school_admin']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const rawBody = await req.json()
    const input = validateInput(eventCreateSchema, rawBody)
    if ('error' in input) return input.error
    const { type, payload, metadata } = input.data

    const result = await eventBus.emit({
      id: crypto.randomUUID(),
      type: type as EventType,
      timestamp: new Date().toISOString(),
      source: {
        userId: auth.user.id,
        orgId: auth.user.schoolId ?? null,
        schoolId: auth.user.schoolId ?? null,
      },
      payload: payload ?? {},
      metadata: {
        ...(metadata ?? {}),
        correlationId: (metadata?.correlationId as string) ?? crypto.randomUUID(),
        causationId: null,
        version: 1,
        emittedBy: 'api/events',
        environment: process.env.NODE_ENV ?? 'development',
      },
    })

    return NextResponse.json(result, { status: 202 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to publish event', details: String(error) },
      { status: 500 }
    )
  }
}
