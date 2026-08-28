import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import {
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
} from '@/lib/workflow/workflow-service'
import type { UpdateWorkflowInput } from '@/lib/workflow/workflow-service'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/workflows/[id] — Get single workflow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const workflow = await getWorkflow(id)

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    return NextResponse.json(workflow)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch workflow', details: String(error) },
      { status: 500 }
    )
  }
}

// PATCH /api/workflows/[id] — Update workflow
export async function PATCH(
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
    const input: UpdateWorkflowInput = body as unknown as UpdateWorkflowInput

    const workflow = await updateWorkflow(id, input)

    return NextResponse.json(workflow)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update workflow', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/workflows/[id] — Delete workflow
export async function DELETE(
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
    await deleteWorkflow(id)

    return NextResponse.json({ success: true, id })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete workflow', details: String(error) },
      { status: 500 }
    )
  }
}
