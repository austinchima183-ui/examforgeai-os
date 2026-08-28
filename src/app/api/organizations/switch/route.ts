import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { switchOrganization } from '@/lib/enterprise/organization-service'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// POST /api/organizations/switch — Switch active organization
export async function POST(request: NextRequest) {
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
    const switchOrganizationSchema = z.object({ organizationId: z.string().uuid() }).strict()
    const input = validateInput(switchOrganizationSchema, rawBody)
    if ('error' in input) return input.error
    const { organizationId } = input.data as { organizationId: string }

    const result = await switchOrganization(auth.user.id, organizationId)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }

    return NextResponse.json({
      tenantContext: result.value,
      switchedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to switch organization', details: String(error) },
      { status: 500 }
    )
  }
}
