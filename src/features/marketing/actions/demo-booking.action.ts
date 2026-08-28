'use server'

// ============================================================================
// ExamForge AI — Demo Booking Server Action
// ============================================================================
// Validates input, rate limits, sanitizes, stores booking in Supabase,
// creates lead with high score (demo = high intent), logs activity,
// sends confirmation to booker and notification to sales team.
// ============================================================================

import { demoBookingSchema, type DemoBookingFormData } from '@/lib/validators/demo-booking'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sanitizeObject, isBot } from '@/lib/security'
import { emailService } from '@/lib/email/service'
import { demoConfirmation } from '@/lib/email/templates'
import { calculateLeadScore, getScoreTier } from '@/lib/crm/lead-scoring'
import { headers } from 'next/headers'

export interface DemoBookingResult {
  success: boolean
  bookingId?: string
  error?: string
}

export async function bookDemo(input: DemoBookingFormData): Promise<DemoBookingResult> {
  // 1. Validate with Zod
  const parsed = demoBookingSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Invalid input' }
  }

  // 2. Rate limiting (3 per hour per IP)
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  const userAgent = headersList.get('user-agent') || ''

  // 3. Bot detection
  if (isBot(userAgent)) {
    return { success: false, error: 'Submission not allowed' }
  }

  // 4. Rate limit check
  const rateResult = await checkRateLimit(`demo:${ip}`, 3, 3600000)
  if (!rateResult.allowed) {
    return { success: false, error: 'Too many booking attempts. Please try again later.' }
  }

  // 5. Sanitize inputs
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

  try {
    const supabase = await createClient()

    // 6. Store in demo_bookings table
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
      console.error('[Demo Booking] DB insert error:', insertError)
      return { success: false, error: 'Failed to book demo. Please try again.' }
    }

    // 7. Create lead with high score (demo = high intent)
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, score')
      .eq('email', sanitized.email)
      .single()

    let leadId: string | null = existingLead?.id ?? null

    if (existingLead) {
      // Update existing lead — demo booking is high intent
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
        source: sanitized.source === 'direct' ? 'direct' : 'organic',
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

    // 8. Link lead to booking and log activity
    if (leadId) {
      await supabase.from('demo_bookings').update({ lead_id: leadId }).eq('id', booking.id)

      await supabase.from('lead_activities').insert({
        lead_id: leadId,
        type: 'demo_booked',
        description: `Demo booked for ${sanitized.preferred_date} at ${sanitized.preferred_time} (${sanitized.timezone})`,
        metadata: {
          booking_id: booking.id,
          team_size: sanitized.team_size,
          company: sanitized.company,
        },
      })
    }

    // 9. Send confirmation email to booker
    const confirmationEmail = demoConfirmation(parsed.data, booking.id)
    emailService
      .send({
        to: sanitized.email,
        subject: confirmationEmail.subject,
        html: confirmationEmail.html,
        text: confirmationEmail.text,
      })
      .catch((err) => console.error('[Demo Booking] Confirmation email failed:', err))

    // 10. Send notification to sales team
    const firstName = sanitized.name.split(' ')[0]
    const lastName = sanitized.name.split(' ').slice(1).join(' ') || ''
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
      .catch((err) => console.error('[Demo Booking] Sales notification email failed:', err))

    return { success: true, bookingId: booking.id }
  } catch (error) {
    console.error('[Demo Booking] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}
