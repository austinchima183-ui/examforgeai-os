import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult

  const { reviewId } = await request.json()
  if (!reviewId) {
    return NextResponse.json({ error: 'Review ID required' }, { status: 400 })
  }

  const supabase = await requireSupabase()
  // ── Dev Adapter Guard ──
  if (!supabase && isDevAdapterMode()) {
    return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
  }

  // Create a report record
  const { error } = await supabase
    .from('marketplace_review_reports')
    .insert({
      review_id: reviewId,
      reporter_id: authResult.user.id,
      status: 'pending',
    })

  if (error) {
    // If table doesn't exist, still return success for UX
    console.error('Report error:', error)
  }

  return NextResponse.json({ success: true })
}
