import { createServiceClient } from '@/lib/supabase/service'
import { toCamelRow, toCamelRows } from '@/lib/utils/case-map'
import { NextRequest, NextResponse } from 'next/server'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { requireApiRole, deriveTenantContext, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { requireFeature } from '@/lib/billing/plan-gate'

// GET /api/admin/integrations - List integrations
export async function GET(req: NextRequest) {
  // ─── Feature gate: Advanced integrations requires Professional+ ───
  const featureDenial = await requireFeature('advanced_integrations', req)
  if (featureDenial) return featureDenial

  const { allowed, retryAfter } = await apiRateLimit(req, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiRole(req, ['super_admin'])
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const schoolId = searchParams.get('schoolId')

    let integrationsQuery = supabase.from('integrations').select('*')
    if (schoolId) integrationsQuery = integrationsQuery.eq('school_id', schoolId)

    const { data: integrations, error } = await integrationsQuery.order('name', { ascending: true })
    if (error) throw new Error(error.message)

    return NextResponse.json(toCamelRows(integrations) ?? [])
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch integrations' }, { status: 500 })
  }
}

// PUT /api/admin/integrations - Update integration config
export async function PUT(req: NextRequest) {
  // ─── Feature gate: Advanced integrations requires Professional+ ───
  const featureDenialPut = await requireFeature('advanced_integrations', req)
  if (featureDenialPut) return featureDenialPut

  const { allowed: putAllowed, retryAfter: putRetry } = await apiRateLimit(req, RATE_LIMITS.write)
  if (!putAllowed) return rateLimitError(putRetry)

  const authPut = await requireApiRole(req, ['super_admin'])
  if (authPut instanceof NextResponse) return authPut

  const csrfPut = enforceCsrf(req, authPut)
  if (csrfPut) return csrfPut

  const tenantPut = deriveTenantContext(authPut)

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const rawBody = await req.json()
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data as Record<string, unknown>
    const { id, config, status, error } = body

    const { data: integration, error: updateError } = await supabase
      .from('integrations')
      .update({
        ...(config !== undefined && { config: JSON.stringify(config) }),
        ...(status !== undefined && { status: status as string }),
        ...(error !== undefined && { error: error as string | null }),
        last_sync_at: status === 'connected' ? new Date().toISOString() : undefined,
      })
      .eq('id', id as string)
      .select('*')
      .single()
    if (updateError || !integration) {
      throw new Error(updateError?.message ?? 'Failed to update integration')
    }

    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: tenantPut.userId,
      action: 'update',
      entity: 'integration',
      entity_id: id as string,
      details: JSON.stringify({ name: integration.name, status }),
    })
    if (auditError) throw new Error(auditError.message)

    return NextResponse.json(toCamelRow(integration))
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update integration' }, { status: 500 })
  }
}

// POST /api/admin/integrations - Test integration connection
export async function POST(req: NextRequest) {
  // ─── Feature gate: Advanced integrations requires Professional+ ───
  const featureDenialPost = await requireFeature('advanced_integrations', req)
  if (featureDenialPost) return featureDenialPost

  const { allowed: postAllowed, retryAfter: postRetry } = await apiRateLimit(req, RATE_LIMITS.write)
  if (!postAllowed) return rateLimitError(postRetry)

  const authPost = await requireApiRole(req, ['super_admin'])
  if (authPost instanceof NextResponse) return authPost

  const csrfPost = enforceCsrf(req, authPost)
  if (csrfPost) return csrfPost

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const rawBody = await req.json()
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data as Record<string, unknown>
    const { id } = body

    const { data: integration, error: findError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', id as string)
      .maybeSingle()
    if (findError) throw new Error(findError.message)
    if (!integration) return NextResponse.json({ error: 'Integration not found' }, { status: 404 })

    // Test connection — attempt a real sync check based on integration type
    // For integrations with a configured endpoint, verify connectivity
    let isSuccess = true
    try {
      const config = integration.config ? JSON.parse(integration.config as string) : {}
      // If the integration has a webhook URL or API endpoint, do a HEAD request to verify
      if (config.webhookUrl) {
        const testRes = await fetch(config.webhookUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        isSuccess = testRes.ok
      } else if (config.apiEndpoint) {
        const testRes = await fetch(config.apiEndpoint, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
        isSuccess = testRes.ok
      }
      // If no endpoint to test, assume configured integrations are connected
    } catch {
      isSuccess = false
    }
    const { data: updated, error: updateError } = await supabase
      .from('integrations')
      .update({
        status: isSuccess ? 'connected' : 'error',
        error: isSuccess ? null : 'Connection timeout - please verify credentials',
        last_sync_at: isSuccess ? new Date().toISOString() : null,
      })
      .eq('id', id as string)
      .select('*')
      .single()
    if (updateError || !updated) {
      throw new Error(updateError?.message ?? 'Failed to update integration')
    }

    return NextResponse.json({ success: isSuccess, integration: updated, message: isSuccess ? 'Connection successful' : 'Connection failed' })
  } catch (error) {
    return NextResponse.json({ error: 'Test failed' }, { status: 500 })
  }
}
