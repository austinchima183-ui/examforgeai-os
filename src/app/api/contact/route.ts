// ============================================================================
// ExamForge AI — Contact API Route (POST)
// ============================================================================
// REST endpoint alternative for contact form submission.
// Same logic as server action but with proper HTTP status codes and rate limit headers.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { contactSchema, derivePriority, type ContactFormData } from '@/lib/validators/contact'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { sanitizeObject, isBot, detectSpam } from '@/lib/security'
import { emailService } from '@/lib/email/service'
import { contactNotification, contactAutoReply } from '@/lib/email/templates'
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

    // 1. Validate with Zod schema
    const parsed = contactSchema.safeParse(body as ContactFormData)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid form data',
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const data = parsed.data

    // 2. Check honeypot field
    if (data.honeypot && data.honeypot.length > 0) {
      return NextResponse.json({ success: true, id: `hp-${Date.now()}` }, { status: 200 })
    }

    // 3. Get request metadata
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || ''

    // 4. Bot detection
    if (isBot(userAgent)) {
      return NextResponse.json(
        { success: false, error: 'Submission not allowed' },
        { status: 403 }
      )
    }

    // 5. Rate limit (3 per hour per IP)
    const rateResult = await checkRateLimit(`contact:${ip}`, 3, 3600000)
    if (!rateResult.allowed) {
      const rateHeaders = getRateLimitHeaders(rateResult, 3)
      return NextResponse.json(
        { success: false, error: 'Too many submissions. Please try again later.' },
        {
          status: 429,
          headers: {
            ...rateHeaders,
            'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
          },
        }
      )
    }

    // 6. Sanitize inputs
    const sanitized = sanitizeObject({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email.toLowerCase(),
      phone: data.phone || null,
      school: data.school || null,
      institution_type: data.institutionType || null,
      subject: data.subject,
      message: data.message,
      priority: derivePriority(data.subject),
    })

    // 7. Spam detection
    const spamResult = detectSpam(data.message)
    if (spamResult.isSpam) {
      return NextResponse.json(
        { success: false, error: 'Your message appears to be spam. Please revise.' },
        { status: 422 }
      )
    }

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // 8. Store in database
    const { data: submission, error: insertError } = await supabase
      .from('contact_submissions')
      .insert({
        ...sanitized,
        status: 'new',
        ip_address: ip,
        user_agent: userAgent,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[Contact API] DB insert error:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to submit. Please try again.' },
        { status: 500 }
      )
    }

    // 9. Create or update lead with scoring
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, score')
      .eq('email', sanitized.email)
      .single()

    let leadId: string | null = existingLead?.id ?? null

    if (!existingLead) {
      const score = calculateLeadScore({
        institutionType: data.institutionType,
        source: 'organic',
        formFills: 1,
      })

      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          email: sanitized.email,
          first_name: sanitized.first_name,
          last_name: sanitized.last_name,
          phone: sanitized.phone,
          company: sanitized.school,
          institution_type: sanitized.institution_type,
          source: 'organic',
          stage: 'new',
          score,
          score_tier: getScoreTier(score),
          last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      leadId = newLead?.id ?? null
    } else {
      await supabase
        .from('leads')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', leadId)
    }

    if (leadId) {
      await supabase.from('contact_submissions').update({ lead_id: leadId }).eq('id', submission.id)
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        type: 'form_submit',
        description: `Contact form submitted: ${data.subject}`,
        metadata: { submission_id: submission.id, subject: data.subject },
      })
    }

    // 10. Send emails (non-blocking)
    const fullName = `${data.firstName} ${data.lastName}`

    const salesEmail = contactNotification(data)
    emailService
      .send({
        to: process.env.SALES_TEAM_EMAIL ?? 'sales@examforge.ai',
        subject: salesEmail.subject,
        html: salesEmail.html,
        text: salesEmail.text,
      })
      .catch((err) => console.error('[Contact API] Sales notification failed:', err))

    const replyEmail = contactAutoReply(fullName, data.email)
    emailService
      .send({
        to: data.email,
        subject: replyEmail.subject,
        html: replyEmail.html,
        text: replyEmail.text,
      })
      .catch((err) => console.error('[Contact API] Auto-reply failed:', err))

    const rateHeaders = getRateLimitHeaders(rateResult, 3)
    return NextResponse.json(
      { success: true, id: submission.id },
      { status: 200, headers: rateHeaders }
    )
  } catch (error) {
    console.error('[Contact API] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
