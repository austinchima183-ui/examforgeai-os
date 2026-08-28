import { NextRequest, NextResponse } from 'next/server'
import {
  requireApiRole,
  deriveTenantContext,
  createSafeErrorResponse,
  rateLimitError,
} from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { listAPIKeys, createAPIKey } from '@/lib/developer/api-key-service'
import type { CreateAPIKeyInput } from '@/lib/developer/types'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const createApiKeySchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  scopes: z.array(z.string()).default([]),
  expiresAt: z.string().nullable().default(null),
  rateLimitOverride: z.number().int().min(1).nullable().default(null),
})

// GET /api/developer/keys — List API keys
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (super_admin/school_admin only)
    const auth = await requireApiRole(request, ['super_admin', 'school_admin'])
    if (auth instanceof NextResponse) return auth

    // Derive tenant context from server-side session — NEVER trust client input
    const tenant = deriveTenantContext(auth)
    if (!tenant.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with your account', code: 'NO_ORG' },
        { status: 400 }
      )
    }

    // Use server-derived organizationId and userId
    const keys = await listAPIKeys(tenant.organizationId)

    return NextResponse.json({ keys })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'developer/keys:GET' }), { status: 500 })
  }
}

// POST /api/developer/keys — Create API key
export async function POST(request: NextRequest) {
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

    // Derive tenant context from server-side session — NEVER trust client input
    const tenant = deriveTenantContext(auth)
    if (!tenant.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with your account', code: 'NO_ORG' },
        { status: 400 }
      )
    }

    // Validate input
    const body = await request.json()
    const input = validateInput(createApiKeySchema, body)
    if ('error' in input) return input.error

    // Use server-derived organizationId and userId
    const createInput: CreateAPIKeyInput = {
      orgId: tenant.organizationId,
      name: input.data.name,
      scopes: input.data.scopes as unknown as CreateAPIKeyInput['scopes'],
      expiresAt: input.data.expiresAt ? new Date(input.data.expiresAt) : undefined,
      createdBy: tenant.userId,
    }

    const result = await createAPIKey(createInput)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'developer/keys:POST' }), { status: 500 })
  }
}
