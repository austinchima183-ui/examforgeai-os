import { createServiceClient } from '@/lib/supabase/service'
import { toCamelRow, toCamelRows } from '@/lib/utils/case-map'
import { NextRequest, NextResponse } from 'next/server'
import { validateInput } from '@/lib/api/validate'
import { brandingUpdateSchema } from '@/lib/validators/api-schemas'
import { requireApiRole, deriveTenantContext, createSafeErrorResponse, rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/admin/branding - Get branding settings
export async function GET(req: NextRequest) {
  const { allowed, retryAfter } = await apiRateLimit(req, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiRole(req, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth
  const tenant = deriveTenantContext(auth)

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School ID required' }, { status: 400 })

    const [schoolResult, settingsResult] = await Promise.all([
      supabase.from('schools').select('*').eq('id', schoolId).maybeSingle(),
      supabase.from('school_settings').select('*').eq('school_id', schoolId),
    ])

    if (schoolResult.error) throw new Error(schoolResult.error.message)
    if (settingsResult.error) throw new Error(settingsResult.error.message)

    const settingsMap: Record<string, string> = {}
    for (const s of settingsResult.data ?? []) {
      settingsMap[s.key] = s.value
    }

    // Map Supabase column names back to the original API contract
    // (Prisma tagline/accentColor ↔ Supabase motto/secondary_color)
    const schoolRow = schoolResult.data as Record<string, unknown> | null
    const schoolResponse = schoolRow
      ? {
          ...toCamelRow(schoolRow) as Record<string, unknown>,
          tagline: schoolRow.motto ?? null,
          accentColor: schoolRow.secondary_color ?? null,
        }
      : null

    return NextResponse.json({ school: schoolResponse, settings: settingsMap })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'getBranding' }), { status: 500 })
  }
}

// PUT /api/admin/branding - Update branding settings
export async function PUT(req: NextRequest) {
  const { allowed, retryAfter } = await apiRateLimit(req, RATE_LIMITS.write)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiRole(req, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth
  const tenant = deriveTenantContext(auth)

  // CSRF guard
  const csrfBranding = enforceCsrf(req, auth)
  if (csrfBranding) return csrfBranding

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const rawBody = await req.json()
    const bodyResult = validateInput(brandingUpdateSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    // Use server-derived schoolId instead of client-supplied value
    const schoolId = tenant.schoolId
    if (!schoolId) return NextResponse.json({ error: 'School ID required' }, { status: 400 })
    const { schoolData, settings } = body

    // Update school basic info
    // (Prisma tagline/accentColor map to the Supabase schools motto/secondary_color columns;
    //  undefined fields are skipped, matching Prisma's partial-update semantics)
    if (schoolData) {
      const { error: schoolUpdateError } = await supabase
        .from('schools')
        .update({
          name: schoolData.name,
          motto: schoolData.tagline,
          logo_url: schoolData.logoUrl,
          primary_color: schoolData.primaryColor,
          secondary_color: schoolData.accentColor,
          address: schoolData.address,
          city: schoolData.city,
          phone: schoolData.phone,
          email: schoolData.email,
        })
        .eq('id', schoolId)
        .select('id')
        .single()
      if (schoolUpdateError) throw new Error(schoolUpdateError.message)
    }

    // Update settings (select-then-update-or-insert: Supabase has no upsert helper here)
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        const { data: existingSetting, error: findError } = await supabase
          .from('school_settings')
          .select('id')
          .eq('school_id', schoolId)
          .eq('key', key)
          .maybeSingle()
        if (findError) throw new Error(findError.message)

        if (existingSetting) {
          const { error: settingUpdateError } = await supabase
            .from('school_settings')
            .update({ value: String(value) })
            .eq('id', existingSetting.id)
          if (settingUpdateError) throw new Error(settingUpdateError.message)
        } else {
          const { error: settingInsertError } = await supabase
            .from('school_settings')
            .insert({ school_id: schoolId, key, value: String(value) })
          if (settingInsertError) throw new Error(settingInsertError.message)
        }
      }
    }

    const { error: auditError } = await supabase.from('audit_logs').insert({
      user_id: tenant.userId,
      action: 'update',
      entity: 'school',
      entity_id: schoolId,
      details: JSON.stringify({ schoolData: !!schoolData, settings: settings ? Object.keys(settings) : [] }),
    })
    if (auditError) throw new Error(auditError.message)

    // Return updated
    const [schoolResult, updatedSettingsResult] = await Promise.all([
      supabase.from('schools').select('*').eq('id', schoolId).maybeSingle(),
      supabase.from('school_settings').select('*').eq('school_id', schoolId),
    ])
    if (schoolResult.error) throw new Error(schoolResult.error.message)
    if (updatedSettingsResult.error) throw new Error(updatedSettingsResult.error.message)

    const settingsMap: Record<string, string> = {}
    for (const s of updatedSettingsResult.data ?? []) settingsMap[s.key] = s.value

    // Map Supabase column names back to the original API contract
    // (Prisma tagline/accentColor ↔ Supabase motto/secondary_color)
    const schoolRow = schoolResult.data as Record<string, unknown> | null
    const schoolResponse = schoolRow
      ? {
          ...toCamelRow(schoolRow) as Record<string, unknown>,
          tagline: schoolRow.motto ?? null,
          accentColor: schoolRow.secondary_color ?? null,
        }
      : null

    return NextResponse.json({ school: schoolResponse, settings: settingsMap })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'updateBranding' }), { status: 500 })
  }
}
