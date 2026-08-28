import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { getReportsData } from '@/lib/services/reports-service'
import { validateInput } from '@/lib/api/validate'
import { parentQuerySchema } from '@/lib/validators/api-schemas'
import { z } from 'zod'

// ============================================================================
// ExamForge AI — Reports API Route
// ============================================================================
// Returns role-scoped report data. Requires authentication.
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
    const reportQuerySchema = parentQuerySchema.extend({ from: z.string().optional(), to: z.string().optional() })
    const queryResult = validateInput(reportQuerySchema, queryObj)
    if ('error' in queryResult) return queryResult.error
    const resultData = queryResult.data as Record<string, unknown>
    const dateFrom = resultData?.from as string | undefined
    const dateTo = resultData?.to as string | undefined

    const data = await getReportsData(user.role, user.id, user.schoolId, dateFrom, dateTo)

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch reports data' },
      { status: 500 }
    )
  }
}
