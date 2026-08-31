import { NextRequest, NextResponse} from 'next/server'
import { requireApiRole } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { requireFeature } from '@/lib/billing/plan-gate'

// ============================================================================
// ExamForge AI — Settings SSO API Route (alias for /api/security/sso)
// ============================================================================
// Delegates to the existing SSO service but adds the feature gate at the
// /api/settings/sso path for convenience.
// Feature-gated: sso_saml requires Enterprise
// ============================================================================

// GET /api/settings/sso — List SSO providers (delegates to security/sso)
export async function GET(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth
  // ─── Feature gate: SSO/SAML requires Enterprise ───
  const featureDenial = await requireFeature('sso_saml', request)
  if (featureDenial) return featureDenial

  // Delegate to the existing SSO route handler
  const { GET: securityGet } = await import('@/app/api/security/sso/route')
  return securityGet(request)
}

// POST /api/settings/sso — Configure SSO provider (delegates to security/sso)
export async function POST(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  // ─── Feature gate: SSO/SAML requires Enterprise ───
  const featureDenial = await requireFeature('sso_saml', request)
  if (featureDenial) return featureDenial

  // Delegate to the existing SSO route handler
  const { POST: securityPost } = await import('@/app/api/security/sso/route')
  return securityPost(request)
}
