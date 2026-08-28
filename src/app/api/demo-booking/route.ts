// ============================================================================
// ExamForge AI — Demo Booking API Route (POST)
// ============================================================================
// REST endpoint for demo booking with lead scoring, email notifications,
// and proper HTTP status codes.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { demoBookingSchema, type DemoBookingFormData } from '@/lib/validators/demo-booking'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { sanitizeObject, isBot } from '@/lib/security'
import { emailService } from '@/lib/email/service'
import { demoConfirmation } from '@/lib/email/templates'
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
    const parsed = demoBookingSchema.safeParse(body as DemoBookingFormData)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || ''

    // Bot detection
    if (isBot(userAgent)) {
      return NextResponse.json(
        { success: false, error: 'Submission not allowed' },
        { status: 403 }
      )
    }

    // Rate limit (3 per hour per IP)
    const rateResult = await checkRateLimit(`demo:${ip}`, 3, 3600000)
    if (!rateResult.allowed) {
      const rateHeaders = getRateLimitHeaders(rateResult, 3)
      return NextResponse.json(
        { success: false, error: 'Too many booking attempts. Please try again later.' },
        { status: 429, headers: rateHeaders }
      )
    }

    // Sanitize inputs
    const sanitized = sanitizeObject({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      company: parsed.data.company,
      role: parsed.data.role,
      team_size: parsed.data.teamSize,
      preferred_date: parsed.data.preferredDate,
      preferred_time: parsed.data.preferredTime,
      timezone: parsed.data.timezone,
      notes: parsed.data.notes || null,
      source: parsed.data.source,
    })

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // Store in demo_bookings
    const { data: booking, error: insertError } = await supabase
      .from('demo_bookings')
      .insert({
        name: sanitized.name,
        email: sanitized.email,
        company: sanitized.company,
        role: sanitized.role,
        team_size: sanitized.team_size,
        preferred_date: sanitized.preferred_date,
        preferred_time: sanitized.preferred_time,
        timezone: sanitized.timezone,
        notes: sanitized.notes,
        source: sanitized.source,
        status: 'scheduled',
        ip_address: ip,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[Demo Booking API] DB insert error:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to book demo. Please try again.' },
        { status: 500 }
      )
    }

    // Create lead with high score (demo = high intent)
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, score')
      .eq('email', sanitized.email)
      .single()

    let leadId: string | null = existingLead?.id ?? null

    if (existingLead) {
      const newScore = Math.min((existingLead.score ?? 0) + 15, 100)
      await supabase
        .from('leads')
        .update({
          stage: 'qualified',
          score: newScore,
          score_tier: getScoreTier(newScore),
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', leadId)
    } else {
      const score = calculateLeadScore({
        role: sanitized.role,
        source: 'direct',
        hasDemo: true,
        formFills: 1,
      })

      const firstName = sanitized.name.split(' ')[0]
      const lastName = sanitized.name.split(' ').slice(1).join(' ') || null

      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          email: sanitized.email,
          first_name: firstName,
          last_name: lastName,
          company: sanitized.company,
          role: sanitized.role,
          source: 'direct',
          stage: 'qualified',
          score,
          score_tier: getScoreTier(score),
          team_size: sanitized.team_size,
          last_activity_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      leadId = newLead?.id ?? null
    }

    if (leadId) {
      await supabase.from('demo_bookings').update({ lead_id: leadId }).eq('id', booking.id)
      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        type: 'demo_booked',
        description: `Demo booked for ${sanitized.preferred_date} at ${sanitized.preferred_time} (${sanitized.timezone})`,
        metadata: { booking_id: booking.id, team_size: sanitized.team_size },
      })
    }

    // Send confirmation email to booker
    const confirmationEmail = demoConfirmation(parsed.data, booking.id)
    emailService
      .send({
        to: sanitized.email,
        subject: confirmationEmail.subject,
        html: confirmationEmail.html,
        text: confirmationEmail.text,
      })
      .catch((err) => console.error('[Demo Booking API] Confirmation email failed:', err))

    // Send notification to sales team
    emailService
      .send({
        to: process.env.SALES_TEAM_EMAIL ?? 'sales@examforge.ai',
        subject: `[ExamForge AI] New Demo Request: ${sanitized.company}`,
        html: `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;padding:20px;">
          <h2>New Demo Booking</h2>
          <p><strong>Name:</strong> ${sanitized.name}</p>
          <p><strong>Email:</strong> ${sanitized.email}</p>
          <p><strong>Company:</strong> ${sanitized.company}</p>
          <p><strong>Role:</strong> ${sanitized.role}</p>
          <p><strong>Team Size:</strong> ${sanitized.team_size}</p>
          <p><strong>Date:</strong> ${sanitized.preferred_date}</p>
          <p><strong>Time:</strong> ${sanitized.preferred_time} (${sanitized.timezone})</p>
          ${sanitized.notes ? `<p><strong>Notes:</strong> ${sanitized.notes}</p>` : ''}
          <p><strong>Booking ID:</strong> ${booking.id}</p>
        </body></html>`,
        text: `New Demo Booking\n\nName: ${sanitized.name}\nEmail: ${sanitized.email}\nCompany: ${sanitized.company}\nRole: ${sanitized.role}\nTeam Size: ${sanitized.team_size}\nDate: ${sanitized.preferred_date}\nTime: ${sanitized.preferred_time} (${sanitized.timezone})\n${sanitized.notes ? `Notes: ${sanitized.notes}\n` : ''}Booking ID: ${booking.id}`,
      })
      .catch((err) => console.error('[Demo Booking API] Sales notification failed:', err))

    const rateHeaders = getRateLimitHeaders(rateResult, 3)
    return NextResponse.json(
      { success: true, bookingId: booking.id },
      { status: 200, headers: rateHeaders }
    )
  } catch (error) {
    console.error('[Demo Booking API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    )
  }
}
