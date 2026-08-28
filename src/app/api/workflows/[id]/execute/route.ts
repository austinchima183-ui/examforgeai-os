import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { workflowEngine } from '@/lib/workflow/workflow-engine'
import { getWorkflow } from '@/lib/workflow/workflow-service'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// POST /api/workflows/[id]/execute — Trigger workflow execution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    const { id } = await params
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data

    // Verify workflow exists
    const workflow = await getWorkflow(id)
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const execution = await workflowEngine.executeWorkflow(id, {
      type: (body.triggerType ?? 'manual') as unknown as import('@/lib/workflow/types').WorkflowTriggerType,
      data: (body.input ?? {}) as Record<string, unknown>,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(execution, { status: 202 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to execute workflow', details: String(error) },
      { status: 500 }
    )
  }
}
