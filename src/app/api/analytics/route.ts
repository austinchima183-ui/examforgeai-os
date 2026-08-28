import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { getAnalyticsData } from '@/lib/services/analytics-service'
import { validateInput } from '@/lib/api/validate'
import { analyticsQuerySchema } from '@/lib/validators/api-schemas'

// ============================================================================
// ExamForge AI — Analytics API Route
// ============================================================================
// Returns role-scoped analytics data. Requires authentication.
// ============================================================================

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authResult = await getAuthUser()

  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user } = authResult

  try {
    const { searchParams } = new URL(request.url)
    const queryObj = Object.fromEntries(searchParams.entries())
    const queryResult = validateInput(analyticsQuerySchema, queryObj)
    if ('error' in queryResult) return queryResult.error
    const range = (queryResult.data as Record<string, unknown>)?.range as '7d' | '30d' | '90d' | '1y' | 'all' ?? '30d'

    const data = await getAnalyticsData(user.role, user.id, user.schoolId, range)

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
