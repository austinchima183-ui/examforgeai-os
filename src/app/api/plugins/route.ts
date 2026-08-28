import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { searchPlugins, registerPlugin } from '@/lib/plugins/plugin-registry'
import type { PluginSearchQuery, PluginManifest } from '@/lib/plugins/types'
import { validateInput, validatePagination, parseJsonBody } from '@/lib/api/validate'
import { pluginSearchSchema, pluginRegisterSchema } from '@/lib/validators/api-schemas'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/plugins — Search/list plugins
export async function GET(request: NextRequest) {
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
    const allowedRoles = ['super_admin']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const queryObj = Object.fromEntries(searchParams.entries())
    const queryResult = validateInput(pluginSearchSchema, queryObj)
    if ('error' in queryResult) return queryResult.error
    const query = queryResult.data.query ?? ''
    const type = queryResult.data.category // reuse category as type filter
    const category = queryResult.data.category
    const featured = searchParams.get('featured')
    const page = queryResult.data.page ?? 1
    const limit = queryResult.data.limit ?? 20

    const searchQuery: PluginSearchQuery = {
      query,
      offset: (page - 1) * limit,
      limit,
    }
    if (type) searchQuery.type = type as PluginSearchQuery['type']
    if (category) searchQuery.category = category
    if (featured === 'true') searchQuery.featured = true

    const result = await searchPlugins(searchQuery)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to search plugins', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/plugins — Register plugin
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user } } = await supabase.auth.getUser()
    const userRole = (user?.app_metadata?.role as string) ?? 'student'
    const allowedRoles = ['super_admin']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(pluginRegisterSchema, rawBody)
    if ('error' in input) return input.error
    const result = await registerPlugin(input.data as unknown as PluginManifest)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.manifest, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to register plugin', details: String(error) },
      { status: 500 }
    )
  }
}
