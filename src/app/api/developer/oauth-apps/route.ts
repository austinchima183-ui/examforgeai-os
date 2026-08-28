import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { registerOAuthApp } from '@/lib/developer/oauth-service'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import type { RegisterOAuthAppInput } from '@/lib/developer/types'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { oauthAppCreateSchema } from '@/lib/validators/api-schemas'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/developer/oauth-apps — List OAuth apps
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
    const { data: apps, error } = await supabase
      .from('oauth_apps')
      .select('*')
      .eq('owner_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch OAuth apps' }, { status: 500 })
    }

    return NextResponse.json({ apps })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch OAuth apps', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/developer/oauth-apps — Register OAuth app
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
    const input = validateInput(oauthAppCreateSchema, rawBody)
    if ('error' in input) return input.error
    const body = input.data

    const oauthInput: RegisterOAuthAppInput = {
      orgId: body.organizationId ?? auth.user.schoolId ?? '',
      name: body.name,
      redirectUris: body.redirectUris,
      scopes: (rawBody as Record<string, unknown>).scopes as unknown as RegisterOAuthAppInput['scopes'],
      grantTypes: (rawBody as Record<string, unknown>).grantTypes as unknown as RegisterOAuthAppInput['grantTypes'],
      createdBy: auth.user.id,
    }

    const result = await registerOAuthApp(oauthInput)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to register OAuth app', details: String(error) },
      { status: 500 }
    )
  }
}
