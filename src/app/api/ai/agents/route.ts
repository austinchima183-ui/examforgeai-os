// ============================================================================
// ExamForge AI — Agent System API Routes
// ============================================================================
// POST /api/ai/agents/run       — Run a specific agent
// POST /api/ai/agents/configs   — Get default agent configs for a school
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { runAgent, getDefaultAgentConfigs } from '@/lib/ai'
import type { AgentConfig } from '@/lib/ai'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { rateLimitError } from '@/lib/api/auth-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.ai)
  if (!allowed) return rateLimitError(retryAfter)

  const authResult = await getAuthUser()
  if (!authResult) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['school_admin', 'super_admin'].includes(authResult.user.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // ─── CSRF guard ───────────────────────────────────────────
  const csrfAgents = enforceCsrf(request, authResult)
  if (csrfAgents) return csrfAgents

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { action } = body

    switch (action) {
      case 'run': {
        const config = body.data as AgentConfig
        const result = await runAgent(config, authResult.user.id)
        return NextResponse.json({ success: true, data: result })
      }

      case 'configs': {
        const { schoolId } = body.data as { schoolId: string }
        const configs = getDefaultAgentConfigs(schoolId)
        return NextResponse.json({ success: true, data: configs })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('AI Agents API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
