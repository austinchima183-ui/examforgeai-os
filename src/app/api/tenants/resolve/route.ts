import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { resolveTenantForAPI, getTenantFromDomain } from '@/lib/enterprise/tenant-middleware'
import { isSuccess } from '@/lib/api/result'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { z } from 'zod'

// GET /api/tenants/resolve — Resolve tenant from domain/header/cookie
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First try resolving from the request (domain, header, cookie)
    const tenantResult = await resolveTenantForAPI(req)

    if (isSuccess(tenantResult) && tenantResult.value) {
      const tenant = tenantResult.value
      return NextResponse.json({
        organizationId: tenant.organizationId,
        source: tenant.source,
        matchedValue: tenant.matchedValue,
        resolvedAt: new Date().toISOString(),
      })
    }

    // Fallback: try resolving from custom domain
    const host = req.headers.get('host')
    if (host) {
      const domainResult = await getTenantFromDomain(host)
      if (isSuccess(domainResult) && domainResult.value) {
        return NextResponse.json({
          organizationId: domainResult.value,
          source: 'custom_domain',
          matchedValue: host,
          resolvedAt: new Date().toISOString(),
        })
      }
    }

    // No tenant resolved — return user's default context
    return NextResponse.json({
      organizationId: auth.user.schoolId ?? null,
      source: 'default',
      matchedValue: '',
      resolvedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to resolve tenant', details: String(error) },
      { status: 500 }
    )
  }
}
