'use server'

// ============================================================================
// ExamForge AI — Newsletter Server Action
// ============================================================================
// Validates email, rate limits, checks duplicates, creates subscriber
// with verification token (double opt-in), sends verification email,
// creates lead if not existing, logs activity.
// ============================================================================

import { newsletterSchema, type NewsletterFormData } from '@/lib/validators/newsletter'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/security'
import { emailService } from '@/lib/email/service'
import { newsletterVerification } from '@/lib/email/templates'
import { calculateLeadScore, getScoreTier } from '@/lib/crm/lead-scoring'
import { headers } from 'next/headers'

export interface NewsletterActionResult {
  success: boolean
  message?: string
  error?: string
}

export async function subscribeNewsletter(
  input: NewsletterFormData
): Promise<NewsletterActionResult> {
  // 1. Validate with Zod schema
  const parsed = newsletterSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return { success: false, error: firstError?.message ?? 'Invalid input' }
  }

  // 2. Rate limiting (5 per hour per IP)
  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  const rateResult = await checkRateLimit(`newsletter:${ip}`, 5, 3600000)
  if (!rateResult.allowed) {
    return { success: false, error: 'Too many subscription attempts. Please try again later.' }
  }

  // 3. Sanitize email
  const email = sanitizeInput(parsed.data.email).toLowerCase()

  try {
    const supabase = await createClient()

    // 4. Check for duplicate in newsletter_subscribers
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status, verification_token')
      .eq('email', email)
      .single()

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://examforge.ai'

    if (existing) {
      if (existing.status === 'active') {
        return {
          success: true,
          message: "You're already subscribed! Check your inbox for our latest updates.",
        }
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

        // Send verification email
        const verificationUrl = `${baseUrl}/api/newsletter/verify?token=${newToken}`
        const verificationEmail = newsletterVerification(email.split('@')[0] ?? '', verificationUrl)
        emailService
          .send({
            to: email,
            subject: verificationEmail.subject,
            html: verificationEmail.html,
            text: verificationEmail.text,
          })
          .catch((err) => console.error('[Newsletter Action] Verification email failed:', err))

        return {
          success: true,
          message: 'Please check your email to verify your subscription.',
        }
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
        .catch((err) => console.error('[Newsletter Action] Verification resend failed:', err))

      return {
        success: true,
        message: "You're already subscribed! Please check your email to verify your subscription.",
      }
    }

    // 5. Create new subscriber with verification token
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
      console.error('[Newsletter Action] Insert error:', insertError)
      return { success: false, error: 'Failed to subscribe. Please try again.' }
    }

    // 6. Send verification email (double opt-in)
    const verificationUrl = `${baseUrl}/api/newsletter/verify?token=${verificationToken}`
    const verificationEmail = newsletterVerification(email.split('@')[0] ?? '', verificationUrl)
    emailService
      .send({
        to: email,
        subject: verificationEmail.subject,
        html: verificationEmail.html,
        text: verificationEmail.text,
      })
      .catch((err) => console.error('[Newsletter Action] Verification email failed:', err))

    // 7. Create lead if not existing
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .single()

    if (!existingLead) {
      const score = calculateLeadScore({
        source: 'email',
        hasSubscription: true,
      })

      await supabase.from('leads').insert({
        email,
        source: 'email',
        stage: 'new',
        score,
        score_tier: getScoreTier(score),
        last_activity_at: new Date().toISOString(),
      })
    } else {
      // Log activity on existing lead
      await supabase.from('lead_activities').insert({
        lead_id: existingLead.id,
        type: 'subscription',
        description: 'Newsletter subscription',
        last_activity_at: new Date().toISOString(),
      })
    }

    return {
      success: true,
      message: 'Please check your email to verify your subscription.',
    }
  } catch (error) {
    console.error('[Newsletter Action] Unexpected error:', error)
    return { success: false, error: 'An unexpected error occurred. Please try again.' }
  }
}
