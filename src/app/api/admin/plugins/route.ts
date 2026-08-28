import { NextRequest, NextResponse } from 'next/server'
import { requireApiRole, deriveTenantContext, rateLimitError, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { requireFeature } from '@/lib/billing/plan-gate'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Plugin Marketplace Admin API Route
// ============================================================================
// GET /api/admin/plugins - List available plugins
// POST /api/admin/plugins - Install/uninstall a plugin
// Feature-gated: plugin_marketplace requires Enterprise
// ============================================================================

// GET /api/admin/plugins - List available plugins
export async function GET(request: NextRequest) {
  // ─── Feature gate: Plugin marketplace requires Enterprise ───
  const featureDenial = await requireFeature('plugin_marketplace', request)
  if (featureDenial) return featureDenial

  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth

  try {
    // Delegate to existing plugins service
    const { getAvailablePlugins } = await import('@/lib/plugins/plugin-service')
    const plugins = await getAvailablePlugins()
    return NextResponse.json({ plugins })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'admin/plugins GET' }), { status: 500 })
  }
}

// POST /api/admin/plugins - Install/uninstall a plugin
export async function POST(request: NextRequest) {
  // ─── Feature gate: Plugin marketplace requires Enterprise ───
  const featureDenial = await requireFeature('plugin_marketplace', request)
  if (featureDenial) return featureDenial

  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const body = await request.json()
    const { pluginId, action } = body as { pluginId: string; action: 'install' | 'uninstall' }

    if (!pluginId || !action) {
      return NextResponse.json({ error: 'pluginId and action are required' }, { status: 400 })
    }

    const { installPlugin, uninstallPlugin } = await import('@/lib/plugins/plugin-service')
    const tenant = deriveTenantContext(auth)
    const organizationId = tenant.organizationId ?? ''
    const result = action === 'install'
      ? await installPlugin(pluginId, organizationId, { grantedPermissions: [] }, auth.user.id)
      : await uninstallPlugin(pluginId)

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'admin/plugins POST' }), { status: 500 })
  }
}
