import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { getWorkflowExecutions } from '@/lib/workflow/workflow-service'
import type { WorkflowStepStatus } from '@/lib/workflow/types'
import { validateInput, validatePagination } from '@/lib/api/validate'
import { z } from 'zod'

// GET /api/workflows/[id]/executions — List executions for workflow
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const result = await getWorkflowExecutions(id, {
      status: status ? status as WorkflowStepStatus : undefined,
      limit,
      offset: (page - 1) * limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch workflow executions', details: String(error) },
      { status: 500 }
    )
  }
}
