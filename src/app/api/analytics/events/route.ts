// ============================================================================
// ExamForge AI — Analytics Events API Route (POST)
// ============================================================================
// Receives analytics events (single or batched) and stores them in Supabase.
// Validates event data, rate limits, and stores with UTM parameters.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { requireApiAuth } from '@/lib/api/auth-guard'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// Schema for a single analytics event
const analyticsEventSchema = z.object({
  eventName: z.string().min(1).max(100),
  properties: z.record(z.string(), z.unknown()).optional().nullable(),
  timestamp: z.string().optional(),
  pageUrl: z.string().max(500).optional().nullable(),
  sessionId: z.string().max(100).optional().nullable(),
  referrer: z.string().max(500).optional().nullable(),
  utmSource: z.string().max(100).optional().nullable(),
  utmMedium: z.string().max(100).optional().nullable(),
  utmCampaign: z.string().max(100).optional().nullable(),
})

// Schema for the request body
const analyticsRequestBodySchema = z.object({
  events: z.array(analyticsEventSchema).min(1).max(50),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    const body = await request.json()

    // Validate request body
    const parsed = analyticsRequestBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid event data',
          details: parsed.error.issues[0]?.message,
        },
        { status: 400 }
      )
    }

    const events = parsed.data.events

    // Rate limit (100 per minute per IP)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const rateResult = await checkRateLimit(`analytics:${ip}`, 100, 60000)
    if (!rateResult.allowed) {
      const rateHeaders = getRateLimitHeaders(rateResult, 100)
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429, headers: rateHeaders }
      )
    }

    const userAgent = request.headers.get('user-agent') ?? ''
    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // Prepare events for insertion
    const rows = events.map((event) => ({
      event_name: event.eventName,
      properties: event.properties ?? {},
      user_id: auth.user.id,
      session_id: event.sessionId ?? null,
      ip_address: ip,
      user_agent: userAgent,
      page_url: event.pageUrl ?? null,
      referrer: event.referrer ?? null,
      utm_source: event.utmSource ?? null,
      utm_medium: event.utmMedium ?? null,
      utm_campaign: event.utmCampaign ?? null,
      created_at: event.timestamp ?? new Date().toISOString(),
    }))

    const { error } = await supabase.from('analytics_events').insert(rows)

    if (error) {
      console.error('[Analytics API] Insert error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to store events' },
        { status: 500 }
      )
    }

    const rateHeaders = getRateLimitHeaders(rateResult, 100)
    return NextResponse.json(
      { success: true, count: events.length },
      { status: 200, headers: rateHeaders }
    )
  } catch (error) {
    console.error('[Analytics API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
