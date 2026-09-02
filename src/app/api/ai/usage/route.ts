// ============================================================================
// ExamForge AI — AI Usage Analytics API (Ω-FINAL/Phase 4c)
// ============================================================================
// GET /api/ai/usage
//   Surfaces the ai_generation_requests tracking data (tokens, cost, latency,
//   provider mix, status mix) plus recent generation history.
//
//   Roles:
//     - super_admin   → global stats (all schools)
//     - school_admin  → own school only (scoped by profile school_id)
//     - others        → 403
//
//   The stats functions were previously exported-but-unconsumed (dead code);
//   this endpoint makes the AI platform's usage analytics REAL.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { getGenerationStats, getGenerationHistory } from '@/lib/ai'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { rateLimitError, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { requireSupabase } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  // ─── Rate limit ───────────────────────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  // ─── Auth + role gate ─────────────────────────────────────
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = auth.user.role
  if (role !== 'super_admin' && role !== 'school_admin') {
    return NextResponse.json(
      { error: 'Insufficient permissions', code: 'FORBIDDEN' },
      { status: 403 }
    )
  }

  try {
    const supabase = await requireSupabase()

    // ─── Scope: school_admin is restricted to their own school ───
    let schoolId: string | null = null
    if (role === 'school_admin') {
      const { data: profile } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', auth.user.id)
        .maybeSingle()
      schoolId = profile?.school_id ?? null
      if (!schoolId) {
        // No school bound → empty stats rather than global leak
        return NextResponse.json({
          scope: 'school',
          schoolId: null,
          stats: {
            totalGenerations: 0,
            totalTokens: 0,
            totalCost: 0,
            byProvider: {},
            byStatus: {},
            avgDurationMs: 0,
          },
          recent: { generations: [], total: 0 },
          note: 'No school is associated with this account.',
        })
      }
    }

    // ─── Stats + recent history (engine functions, RLS-scoped) ───
    const [stats, history] = await Promise.all([
      getGenerationStats(role === 'super_admin' ? null : schoolId),
      getGenerationHistory({
        schoolId: role === 'super_admin' ? undefined : (schoolId ?? undefined),
        limit: 20,
      }),
    ])

    return NextResponse.json({
      scope: role === 'super_admin' ? 'global' : 'school',
      schoolId,
      stats,
      recent: history,
    })
  } catch (error) {
    logger.error('AI usage analytics failed', error)
    return NextResponse.json(
      createSafeErrorResponse(error, { route: 'ai/usage:GET' }),
      { status: 500 }
    )
  }
}
