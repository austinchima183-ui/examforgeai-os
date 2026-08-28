import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { AgentRunner } from '@/lib/ai/orchestration/agent-runner'
import type { AgentConfig, AgentContext, AgentType, AgentCapability } from '@/lib/ai/orchestration/types'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// POST /api/agents/[id]/execute — Execute an AI agent
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
    const body = bodyResult.data as Record<string, unknown>

    const runner = new AgentRunner()
    const config: AgentConfig = {
      id,
      type: (body.type ?? 'assistant') as AgentType,
      name: (body.name as string) ?? id,
      organizationId: auth.user.schoolId ?? '',
      capabilities: (body.capabilities ?? []) as AgentCapability[],
      model: (body.model as string) ?? 'gpt-4',
      maxTokens: (body.maxTokens as number) ?? 4096,
      temperature: (body.temperature as number) ?? 0.7,
      schedule: (body.schedule ?? { type: 'on_demand' }) as AgentConfig['schedule'],
      enabled: true,
      guardrails: (body.guardrails ?? { maxActionsPerExecution: 50, maxCostPerExecution: 2.00, requireHumanApprovalAbove: 1.00, restrictedActions: [], dataAccessScope: ['own_school'] }) as AgentConfig['guardrails'],
    }
    const agentContext: AgentContext = {
      userId: auth.user.id,
      organizationId: auth.user.schoolId ?? undefined,
      schoolId: auth.user.schoolId ?? undefined,
      agentId: id,
      executionId: crypto.randomUUID(),
    }

    const result = await runner.executeAgent(config, (body.goal as string) ?? '', (body.context ?? {}) as Record<string, unknown>, agentContext)

    return NextResponse.json(result, { status: 202 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to execute agent', details: String(error) },
      { status: 500 }
    )
  }
}
