// ============================================================================
// ExamForge AI — Newsletter Subscribe API Route (POST)
// ============================================================================
// REST endpoint for newsletter subscription with double opt-in.
// Same logic as server action but with proper HTTP status codes.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { newsletterSchema, type NewsletterFormData } from '@/lib/validators/newsletter'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/security'
import { emailService } from '@/lib/email/service'
import { newsletterVerification } from '@/lib/email/templates'
import { calculateLeadScore, getScoreTier } from '@/lib/crm/lead-scoring'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

export async function POST(request: NextRequest) {
  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({}).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const parsed = newsletterSchema.safeParse(body as NewsletterFormData)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    // Rate limiting (5 per hour per IP)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const rateResult = await checkRateLimit(`newsletter:${ip}`, 5, 3600000)
    if (!rateResult.allowed) {
      const rateHeaders = getRateLimitHeaders(rateResult, 5)
      return NextResponse.json(
        { success: false, error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: rateHeaders }
      )
    }

    const email = sanitizeInput(parsed.data.email).toLowerCase()
    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://examforge.ai'

    // Check for duplicate
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status, verification_token')
      .eq('email', email)
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({
          success: true,
          message: "You're already subscribed! Check your inbox for our latest updates.",
        })
      }

      if (existing.status === 'unsubscribed') {
        // Resubscribe with new verification token
        const newToken = crypto.randomUUID()
        await supabase
          .from('newsletter_subscribers')
          .update({
            status: 'pending',
            verification_token: newToken,
            unsubscribed_at: null,
            source: parsed.data.source,
          })
          .eq('id', existing.id)

        const verificationUrl = `${baseUrl}/api/newsletter/verify?token=${newToken}`
        const verificationEmail = newsletterVerification(email.split('@')[0] ?? '', verificationUrl)
        emailService
          .send({
            to: email,
            subject: verificationEmail.subject,
            html: verificationEmail.html,
            text: verificationEmail.text,
          })
          .catch(() => {})

        return NextResponse.json({
          success: true,
          message: 'Please check your email to verify your subscription.',
        })
      }

      // Status is 'pending' — resend verification email
      const verificationUrl = `${baseUrl}/api/newsletter/verify?token=${existing.verification_token}`
      const verificationEmail = newsletterVerification(email.split('@')[0] ?? '', verificationUrl)
      emailService
        .send({
          to: email,
          subject: verificationEmail.subject,
          html: verificationEmail.html,
          text: verificationEmail.text,
        })
        .catch(() => {})

      return NextResponse.json({
        success: true,
        message: "You're already subscribed! Please check your email to verify your subscription.",
      })
    }

    // Create new subscriber
    const verificationToken = crypto.randomUUID()
    const { error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email,
        source: parsed.data.source,
        preferences: parsed.data.preferences ?? [],
        verification_token: verificationToken,
        status: 'pending',
        ip_address: ip,
      })

    if (insertError) {
      console.error('[Newsletter Subscribe API] Insert error:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to subscribe. Please try again.' },
        { status: 500 }
      )
    }

    // Send verification email
    const verificationUrl = `${baseUrl}/api/newsletter/verify?token=${verificationToken}`
    const verificationEmail = newsletterVerification(email.split('@')[0] ?? '', verificationUrl)
    emailService
      .send({
        to: email,
        subject: verificationEmail.subject,
        html: verificationEmail.html,
        text: verificationEmail.text,
      })
      .catch((err) => console.error('[Newsletter Subscribe API] Verification email failed:', err))

    // Create lead if not existing
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .single()

    if (!existingLead) {
      const score = calculateLeadScore({ source: 'email', hasSubscription: true })
      await supabase.from('leads').insert({
        email,
        source: 'email',
        stage: 'new',
        score,
        score_tier: getScoreTier(score),
        last_activity_at: new Date().toISOString(),
      })
    } else {
      await supabase.from('lead_activities').insert({
        lead_id: existingLead.id,
        type: 'subscription',
        description: 'Newsletter subscription',
      })
    }

    const rateHeaders = getRateLimitHeaders(rateResult, 5)
    return NextResponse.json(
      { success: true, message: 'Please check your email to verify your subscription.' },
      { status: 200, headers: rateHeaders }
    )
  } catch (error) {
    console.error('[Newsletter Subscribe API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
