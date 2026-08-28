// ============================================================================
// ExamForge AI — Newsletter Unsubscribe API Route (GET)
// ============================================================================
// Token-based unsubscribe — marks subscriber as unsubscribed,
// logs activity on lead, redirects to confirmation page.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/newsletter/unsubscribe?error=missing-token', request.url)
      )
    }

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // Find subscriber by verification token (reused as unsubscribe token)
    const { data: subscriber, error: findError } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, status')
      .eq('verification_token', token)
      .single()

    if (findError || !subscriber) {
      return NextResponse.redirect(
        new URL('/newsletter/unsubscribe?error=invalid-token', request.url)
      )
    }

    if (subscriber.status === 'unsubscribed') {
      return NextResponse.redirect(
        new URL('/newsletter/unsubscribe?status=already-unsubscribed', request.url)
      )
    }

    // Mark as unsubscribed
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id)

    if (updateError) {
      console.error('[Newsletter Unsubscribe] Update error:', updateError)
      return NextResponse.redirect(
        new URL('/newsletter/unsubscribe?error=update-failed', request.url)
      )
    }

    // Log activity on lead if exists
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', subscriber.email)
      .single()

    if (lead) {
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        type: 'note_added',
        description: 'Unsubscribed from newsletter',
      })
    }

    return NextResponse.redirect(
      new URL('/newsletter/unsubscribe?status=unsubscribed', request.url)
    )
  } catch (error) {
    console.error('[Newsletter Unsubscribe] Error:', error)
    return NextResponse.redirect(
      new URL('/newsletter/unsubscribe?error=unknown', request.url)
    )
  }
}
