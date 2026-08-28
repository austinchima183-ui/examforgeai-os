import { NextRequest, NextResponse } from 'next/server'
import type { PluginPermission } from '@/lib/plugins/types'
import {
  requireApiRole,
  deriveTenantContext,
  createSafeErrorResponse,
  rateLimitError,
} from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateId, validateInput, parseJsonBody } from '@/lib/api/validate'
import { installPlugin } from '@/lib/plugins/plugin-lifecycle'
import type { PluginInstallConfig } from '@/lib/plugins/types'
import { pluginInstallSchema } from '@/lib/validators/api-schemas'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// POST /api/plugins/[id]/install — Install plugin for organization
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (super_admin/school_admin only)
    const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    // Validate plugin ID
    const { id } = await params
    const idResult = validateId(id, 'pluginId')
    if ('error' in idResult) return idResult.error

    // Derive tenant context from server-side session — NEVER trust client input
    const tenant = deriveTenantContext(auth)
    if (!tenant.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with your account', code: 'NO_ORG' },
        { status: 400 }
      )
    }

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(pluginInstallSchema, rawBody)
    if ('error' in input) return input.error

    const installConfig: PluginInstallConfig = {
      settings: (input.data as Record<string, unknown>).settings as Record<string, unknown> | undefined,
      grantedPermissions: ((input.data as Record<string, unknown>).grantedPermissions ?? []) as PluginPermission[],
    }

    // Use server-derived organizationId instead of any client-provided value
    const result = await installPlugin(idResult.data, tenant.organizationId, installConfig, tenant.userId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.installation, { status: 201 })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'plugins/[id]/install' }), { status: 500 })
  }
}
