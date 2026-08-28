import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import type { AgentConfig } from '@/lib/ai/ai-agents'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/agents — List agent configs
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const enabled = searchParams.get('enabled')

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    let query = supabase
      .from('agent_configs')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (type) query = query.eq('agent_type', type)
    if (enabled !== null) query = query.eq('is_active', enabled === 'true')

    const { data: agents, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch agent configs' }, { status: 500 })
    }

    return NextResponse.json({ agents })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch agent configs', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/agents — Create agent config
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data as Record<string, unknown>
    const config: AgentConfig = {
      id: crypto.randomUUID(),
      name: body.name as string,
      type: (body.type as AgentConfig['type']) ?? 'daily_report',
      schedule: (body.schedule as AgentConfig['schedule']) ?? 'daily',
      enabled: (body.enabled as boolean) ?? true,
      schoolId: (body.schoolId as string) ?? auth.user.schoolId ?? undefined,
      params: (body.params as Record<string, unknown>) ?? {},
    }

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: agent, error } = await supabase
      .from('agent_configs')
      .insert({
        id: config.id,
        user_id: auth.user.id,
        agent_type: config.type,
        config: {
          name: config.name,
          schedule: config.schedule,
          params: config.params,
          schoolId: config.schoolId,
        },
        is_active: config.enabled,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create agent config', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create agent config', details: String(error) },
      { status: 500 }
    )
  }
}
