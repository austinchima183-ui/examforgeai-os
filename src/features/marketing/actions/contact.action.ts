'use server'

// ============================================================================
// ExamForge AI — Contact Form Server Action
// ============================================================================
// Validates input, checks honeypot, rate limits, sanitizes, detects spam,
// stores in Supabase, creates/updates lead with scoring, logs activity,
// sends notification emails to sales and auto-reply to user.
// ============================================================================

import { contactSchema, derivePriority, type ContactFormData } from '@/lib/validators/contact'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sanitizeObject, isBot, detectSpam } from '@/lib/security'
import { emailService } from '@/lib/email/service'
import { contactNotification, contactAutoReply } from '@/lib/email/templates'
import { calculateLeadScore, getScoreTier } from '@/lib/crm/lead-scoring'
import { headers } from 'next/headers'

export interface ContactActionResult {
  success: boolean
  id?: string
  error?: string
  fields?: Record<string, string[]>
}

export async function submitContactForm(
  formData: ContactFormData
): Promise<ContactActionResult> {
  // 1. Validate with Zod
  const parsed = contactSchema.safeParse(formData)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Invalid form data',
      fields: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }
  const data = parsed.data

  // 2. Honeypot check — silently accept but don't process (bot detected)
  if (data.honeypot && data.honeypot.length > 0) {
    return { success: true, id: `hp-${Date.now()}` }
  }

  // 3. Rate limiting (3 per hour per IP)
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  const rateResult = await checkRateLimit(`contact:${ip}`, 3, 3600000)
  if (!rateResult.allowed) {
    return { success: false, error: 'Too many submissions. Please try again later.' }
  }

  // 4. Bot detection
  const userAgent = headersList.get('user-agent') || ''
  if (isBot(userAgent)) {
    return { success: false, error: 'Submission not allowed' }
  }

  // 5. Sanitize inputs
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

  // 6. Spam detection
  const spamResult = detectSpam(data.message)
  if (spamResult.isSpam) {
    return { success: false, error: 'Your message appears to be spam. Please revise.' }
  }

  try {
    // 7. Store in Supabase
    const supabase = await createClient()

    const { data: submission, error: dbError } = await supabase
      .from('contact_submissions')
      .insert({
        ...sanitized,
        status: 'new',
        ip_address: ip,
        user_agent: userAgent,
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[Contact Action] DB insert error:', dbError)
      return { success: false, error: 'Failed to submit. Please try again.' }
    }

    // 8. Create or update lead with scoring
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, score')
      .eq('email', sanitized.email)
      .single()

    let leadId = existingLead?.id

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

      leadId = newLead?.id
    } else {
      // Update existing lead's activity timestamp
      await supabase
        .from('leads')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('id', leadId)
    }

    // 9. Link lead to submission and log activity
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

    // Notification to sales team
    const salesEmail = contactNotification(data)
    emailService
      .send({
        to: process.env.SALES_TEAM_EMAIL ?? 'sales@examforge.ai',
        subject: salesEmail.subject,
        html: salesEmail.html,
        text: salesEmail.text,
      })
      .catch((err) => console.error('[Contact Action] Failed to send sales notification:', err))

    // Auto-reply to the user
    const replyEmail = contactAutoReply(fullName, data.email)
    emailService
      .send({
        to: data.email,
        subject: replyEmail.subject,
        html: replyEmail.html,
        text: replyEmail.text,
      })
      .catch((err) => console.error('[Contact Action] Failed to send auto-reply:', err))

    return { success: true, id: submission.id }
  } catch (error) {
    console.error('[Contact Action] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}
