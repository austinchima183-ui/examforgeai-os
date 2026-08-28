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
import {
  getOrganizationBilling,
  createSubscription,
} from '@/lib/billing/subscription-service'
import type { CreateSubscriptionInput } from '@/lib/billing/types'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const createSubscriptionSchema = z.object({
  planId: z.string().min(1, 'planId is required'),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
  seats: z.number().int().min(1).default(1),
  couponCode: z.string().optional(),
  trialDays: z.number().int().min(0).optional(),
})

// GET /api/billing/subscriptions — List subscriptions
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.strict)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (school_admin/super_admin only)
    const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
    if (auth instanceof NextResponse) return auth

    // Derive tenant context from server-side session — NEVER trust client input
    const tenant = deriveTenantContext(auth)
    if (!tenant.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated with your account', code: 'NO_ORG' },
        { status: 400 }
      )
    }

    // Use server-derived organizationId
    const data = await getOrganizationBilling(tenant.organizationId)

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'billing/subscriptions:GET' }), { status: 500 })
  }
}

// POST /api/billing/subscriptions — Create subscription
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.write)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth + role check (school_admin/super_admin only)
    const auth = await requireApiRole(request, ['school_admin', 'super_admin'])
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
    const input = validateInput(createSubscriptionSchema, body)
    if ('error' in input) return input.error

    // Use server-derived organizationId instead of any client-provided value
    const subscriptionInput: CreateSubscriptionInput = {
      orgId: tenant.organizationId,
      plan: input.data.planId as CreateSubscriptionInput['plan'],
      billingCycle: input.data.billingCycle as CreateSubscriptionInput['billingCycle'],
      seats: input.data.seats,
      couponCode: input.data.couponCode,
    }

    const subscription = await createSubscription(subscriptionInput)

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'billing/subscriptions:POST' }), { status: 500 })
  }
}
