// ============================================================================
// ExamForge AI — Newsletter Verify API Route (GET)
// ============================================================================
// Double opt-in: verifies email via token, marks subscriber as active,
// sends welcome email, creates/updates lead, redirects to success page.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { emailService } from '@/lib/email/service'
import { welcomeEmail } from '@/lib/email/templates'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/newsletter/verify?error=missing-token', request.url)
      )
    }

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // Find subscriber by verification token
    const { data: subscriber, error: findError } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, status')
      .eq('verification_token', token)
      .single()

    if (findError || !subscriber) {
      return NextResponse.redirect(
        new URL('/newsletter/verify?error=invalid-token', request.url)
      )
    }

    if (subscriber.status === 'active') {
      return NextResponse.redirect(
        new URL('/newsletter/verify?status=already-verified', request.url)
      )
    }

    // Mark as verified/active
    const { error: updateError } = await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'active',
        verified_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id)

    if (updateError) {
      console.error('[Newsletter Verify] Update error:', updateError)
      return NextResponse.redirect(
        new URL('/newsletter/verify?error=update-failed', request.url)
      )
    }

    // Send welcome email
    const welcome = welcomeEmail(subscriber.email.split('@')[0] ?? '')
    emailService
      .send({
        to: subscriber.email,
        subject: welcome.subject,
        html: welcome.html,
        text: welcome.text,
      })
      .catch((err) => console.error('[Newsletter Verify] Welcome email failed:', err))

    // Update lead activity if lead exists
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', subscriber.email)
      .single()

    if (lead) {
      await supabase.from('lead_activities').insert({
        lead_id: lead.id,
        type: 'subscription',
        description: 'Newsletter email verified (double opt-in completed)',
      })
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL('/newsletter/verify?status=verified', request.url)
    )
  } catch (error) {
    console.error('[Newsletter Verify] Error:', error)
    return NextResponse.redirect(
      new URL('/newsletter/verify?error=unknown', request.url)
    )
  }
}
