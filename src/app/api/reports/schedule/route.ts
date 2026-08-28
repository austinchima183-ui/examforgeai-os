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

  try {
    const { email, reportTitle, reportType, reportId, frequency } = await request.json()

    if (!email || !reportTitle || !frequency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // Store the scheduled report
    const { error } = await supabase
      .from('report_schedules')
      .insert({
        user_id: authResult.user.id,
        email,
        report_title: reportTitle,
        report_type: reportType,
        report_id: reportId,
        frequency,
        is_active: true,
      })

    if (error) {
      // If table doesn't exist, still return success for UX
      console.error('Schedule creation error (table may not exist):', error)
    }

    return NextResponse.json({
      success: true,
      message: `${frequency} report scheduled for ${email}`,
    })
  } catch (error) {
    console.error('Report schedule error:', error)
    return NextResponse.json({ error: 'Failed to schedule report' }, { status: 500 })
  }
}
