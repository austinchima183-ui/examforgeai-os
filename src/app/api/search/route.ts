import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { globalSearch } from '@/lib/services/search-service'
import { validateInput } from '@/lib/api/validate'
import { searchQuerySchema } from '@/lib/validators/api-schemas'
import { rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'

// ============================================================================
// ExamForge AI — Global Search API Route
// ============================================================================
// Returns role-scoped search results. Requires authentication.
// Input validation: minimum 2 characters, maximum 100 characters.
// ============================================================================

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.relaxed)
  if (!allowed) return rateLimitError(retryAfter)

  const authResult = await getAuthUser()

  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const queryObj = Object.fromEntries(searchParams.entries())
    const queryResult = validateInput(searchQuerySchema, queryObj)
    if ('error' in queryResult) return queryResult.error
    const query = queryResult.data.q

    const data = await globalSearch(query, user.id, user.schoolId, user.role)

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}
