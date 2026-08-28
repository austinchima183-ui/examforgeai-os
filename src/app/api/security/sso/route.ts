import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { listSSOProviders, configureSSOProvider } from '@/lib/enterprise-security/sso-service'
import type { SSOProviderConfig, SSOAttributeMapping } from '@/lib/enterprise-security/types'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { ssoCreateSchema } from '@/lib/validators/api-schemas'
import { requireFeature } from '@/lib/billing/plan-gate'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/security/sso — List SSO providers
export async function GET(request: NextRequest) {
  // ─── Feature gate: SSO/SAML requires Enterprise ───
  const featureDenial = await requireFeature('sso_saml', request)
  if (featureDenial) return featureDenial

  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') ?? auth.user.schoolId ?? ''

    const providers = await listSSOProviders(organizationId)

    return NextResponse.json({ providers })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch SSO providers', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/security/sso — Configure SSO provider
export async function POST(request: NextRequest) {
  // ─── Feature gate: SSO/SAML requires Enterprise ───
  const featureDenialPost = await requireFeature('sso_saml', request)
  if (featureDenialPost) return featureDenialPost

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
    const input = validateInput(ssoCreateSchema, rawBody)
    if ('error' in input) return input.error
    const body = input.data
    const orgId = body.organizationId ?? auth.user.schoolId ?? ''

    const config: Omit<SSOProviderConfig, 'id'> & { id?: string } = {
      type: body.type,
      name: body.name,
      clientId: body.config?.clientId ?? '',
      clientSecret: body.config?.clientSecret ?? '',
      issuer: body.config?.issuer ?? null,
      authorizationUrl: body.config?.authorizationUrl ?? '',
      tokenUrl: body.config?.tokenUrl ?? '',
      userInfoUrl: body.config?.userInfoUrl ?? '',
      scopes: body.config?.scopes ?? [],
      attributeMapping: (body.attributeMapping ?? {}) as unknown as SSOAttributeMapping,
      enabled: body.enabled ?? true,
    }

    const provider = await configureSSOProvider(orgId, config)

    return NextResponse.json(provider, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to configure SSO provider', details: String(error) },
      { status: 500 }
    )
  }
}
