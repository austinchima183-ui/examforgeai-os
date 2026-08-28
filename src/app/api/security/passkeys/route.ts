import { NextRequest, NextResponse } from 'next/server'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import {
  requireApiAuth,
  deriveTenantContext,
  createSafeErrorResponse,
  rateLimitError,
  forbiddenError,
} from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import {
  listPasskeys,
  generateRegistrationOptions,
  generateAuthenticationOptions,
} from '@/lib/enterprise-security/passkey-service'

// GET /api/security/passkeys — List passkeys
export async function GET(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth check (any authenticated user)
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    // Derive tenant context from server-side session
    const tenant = deriveTenantContext(auth)

    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId')

    // SECURITY: Only super_admin can query other users' passkeys.
    // All other users can only see their own passkeys.
    let userId: string
    if (requestedUserId && requestedUserId !== tenant.userId) {
      if (auth.user.role !== 'super_admin') {
        return forbiddenError('You can only view your own passkeys')
      }
      userId = requestedUserId
    } else {
      userId = tenant.userId
    }

    const passkeys = await listPasskeys(userId)

    return NextResponse.json({ passkeys })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'security/passkeys:GET' }), { status: 500 })
  }
}

// POST /api/security/passkeys — Start registration or generate authentication options
export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
    if (!allowed) return rateLimitError(retryAfter)

    // Auth check (any authenticated user)
    const auth = await requireApiAuth(request)
    if (auth instanceof NextResponse) return auth

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    // Derive tenant context from server-side session
    const tenant = deriveTenantContext(auth)

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const passkeyActionSchema = z.object({ action: z.enum(['register', 'authenticate']), attestation: z.string().optional(), userVerification: z.string().optional() }).strict()
    const input = validateInput(passkeyActionSchema, rawBody)
    if ('error' in input) return input.error
    const body = input.data as { action: 'register' | 'authenticate'; attestation?: string; userVerification?: string }
    const { action } = body

    if (action === 'register') {
      // Generate WebAuthn registration options — always for the authenticated user
      const options = await generateRegistrationOptions(tenant.userId, {
        attestationType: body.attestation as 'none' | 'indirect' | 'direct' ?? 'none',
      })

      return NextResponse.json({
        options,
        challengeType: 'registration',
      })
    }

    if (action === 'authenticate') {
      // Generate WebAuthn authentication options
      const options = await generateAuthenticationOptions(tenant.userId, {
        userVerification: body.userVerification as 'required' | 'preferred' | 'discouraged' ?? 'preferred',
      })

      return NextResponse.json({
        options,
        challengeType: 'authentication',
      })
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "register" or "authenticate"' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { route: 'security/passkeys:POST' }), { status: 500 })
  }
}
