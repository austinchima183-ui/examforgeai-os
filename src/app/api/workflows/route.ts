import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import {
  getOrganizationWorkflows,
  createWorkflow,
} from '@/lib/workflow/workflow-service'
import type { CreateWorkflowInput } from '@/lib/workflow/workflow-service'
import type { WorkflowDefinition, WorkflowStatus } from '@/lib/workflow/types'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// GET /api/workflows — List workflows
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user } } = await supabase.auth.getUser()
    const userRole = (user?.app_metadata?.role as string) ?? 'student'
    const allowedRoles = ['super_admin', 'school_admin']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId') ?? auth.user.schoolId ?? ''
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const result = await getOrganizationWorkflows(organizationId, {
      status: status ? status as WorkflowStatus : undefined,
      limit,
      offset: (page - 1) * limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch workflows', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/workflows — Create workflow
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── CSRF guard (auto-added: MISSION 11) ───
    const csrfResult = enforceCsrf(request, auth)
    if (csrfResult) return csrfResult

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user } } = await supabase.auth.getUser()
    const userRole = (user?.app_metadata?.role as string) ?? 'student'
    const allowedRoles = ['super_admin', 'school_admin']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const input: CreateWorkflowInput = {
      ...body as unknown as CreateWorkflowInput,
      organizationId: (body as Record<string, unknown>).organizationId as string ?? auth.user.schoolId ?? '',
    }

    const workflow: WorkflowDefinition = await createWorkflow(input)

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create workflow', details: String(error) },
      { status: 500 }
    )
  }
}
