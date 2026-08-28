// ============================================================================
// ExamForge AI — HTML Email Templates
// ============================================================================
// Production-ready HTML email template functions using table-based layout,
// inline styles, 600px max width, and brand colors (#4F46E5 indigo).
// Each function returns { subject, html, text } for use with EmailService.
// ============================================================================

import type { ContactFormData } from '@/lib/validators/contact'
import type { DemoBookingFormData } from '@/lib/validators/demo-booking'

// ─── Brand Constants ────────────────────────────────────────────────────────
const BRAND_COLOR = '#4F46E5'
const BRAND_DARK = '#1a1a2e'
const BRAND_NAME = 'ExamForge AI'
const BRAND_URL = 'https://examforge.ai'
const BRAND_TAGLINE = 'The AI Operating System for Modern Schools'

// ─── Shared Layout Helpers ──────────────────────────────────────────────────

function emailHeader(title: string): string {
  return `
    <tr>
      <td style="background:${BRAND_DARK};padding:32px 24px;border-radius:8px 8px 0 0;">
        <table role="presentation" style="width:100%;border-collapse:collapse;">
          <tr>
            <td>
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;color:#ffffff;font-weight:700;">${BRAND_NAME}</h1>
              <p style="margin:4px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#a0a0c0;">${BRAND_TAGLINE}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

function emailContent(content: string): string {
  return `
    <tr>
      <td style="background:#ffffff;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;">
        ${content}
      </td>
    </tr>`
}

function emailFooter(showUnsubscribe?: boolean, unsubscribeUrl?: string): string {
  const unsubscribeSection = showUnsubscribe
    ? `
        <p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9ca3af;">
          Don't want these emails? <a href="${unsubscribeUrl ?? `${BRAND_URL}/api/newsletter/unsubscribe`}" style="color:${BRAND_COLOR};text-decoration:underline;">Unsubscribe</a>
        </p>`
    : ''

  return `
    <tr>
      <td style="background:#f9fafb;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;">
          &copy; ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
        </p>
        <p style="margin:4px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;">
          <a href="${BRAND_URL}" style="color:${BRAND_COLOR};text-decoration:none;">${BRAND_URL}</a>
        </p>
        ${unsubscribeSection}
      </td>
    </tr>`
}

function wrapDocument(bodyRows: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:32px 16px;" align="center">
        <table role="presentation" style="width:100%;max-width:600px;border-collapse:collapse;">
          ${bodyRows}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;padding:14px 28px;border-radius:6px;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:600;">${label}</a>`
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;">${text}</p>`
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.4;color:#111827;font-weight:700;">${text}</h2>`
}

function detailRow(label: string, value: string): string {
  return `<tr><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#6b7280;font-weight:600;width:140px;vertical-align:top;">${label}</td><td style="padding:8px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;">${value}</td></tr>`
}

// ─── Template: Welcome Email ────────────────────────────────────────────────

export function welcomeEmail(name: string): { subject: string; html: string; text: string } {
  const displayName = name || 'there'

  const html = wrapDocument(
    emailHeader('Welcome!') +
    emailContent(`
      ${heading(`Welcome to ${BRAND_NAME}!`)}
      ${paragraph(`Hi ${displayName},`)}
      ${paragraph(`Thank you for joining <strong>${BRAND_NAME}</strong> — ${BRAND_TAGLINE}. We're excited to have you on board!`)}
      ${paragraph('Here are some next steps to get you started:')}
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 20px 0;">
        <tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">&#x2705; &nbsp;Set up your school profile</td></tr>
        <tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">&#x2705; &nbsp;Import your student data</td></tr>
        <tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#374151;">&#x2705; &nbsp;Create your first exam</td></tr>
      </table>
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr><td align="center" style="padding:8px 0;">${ctaButton(`${BRAND_URL}/dashboard`, 'Go to Dashboard')}</td></tr>
      </table>
    `) +
    emailFooter()
  )

  const text = `Welcome to ${BRAND_NAME}!

Hi ${displayName},

Thank you for joining ${BRAND_NAME} — ${BRAND_TAGLINE}. We're excited to have you on board!

Here are some next steps to get you started:
- Set up your school profile
- Import your student data
- Create your first exam

Dashboard: ${BRAND_URL}/dashboard

Best regards,
The ${BRAND_NAME} Team`

  return { subject: `Welcome to ${BRAND_NAME}!`, html, text }
}

// ─── Template: Newsletter Verification (Double Opt-In) ──────────────────────

export function newsletterVerification(
  name: string,
  verificationUrl: string
): { subject: string; html: string; text: string } {
  const displayName = name || 'there'

  const html = wrapDocument(
    emailHeader('Verify Your Email') +
    emailContent(`
      ${heading('Verify your email address')}
      ${paragraph(`Hi ${displayName},`)}
      ${paragraph('Thanks for subscribing to the <strong>ExamForge AI Newsletter</strong>! Please verify your email address by clicking the button below:')}
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td align="center">${ctaButton(verificationUrl, 'Verify Email')}</td></tr>
      </table>
      ${paragraph(`If the button doesn't work, copy and paste this URL into your browser:`)}
      <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b7280;word-break:break-all;">${verificationUrl}</p>
      ${paragraph('If you didn\'t subscribe, you can safely ignore this email.')}
    `) +
    emailFooter(true)
  )

  const text = `Verify Your Email — ${BRAND_NAME} Newsletter

Hi ${displayName},

Thanks for subscribing to the ${BRAND_NAME} Newsletter! Please verify your email address by visiting:

${verificationUrl}

If you didn't subscribe, you can safely ignore this email.

Best regards,
The ${BRAND_NAME} Team`

  return { subject: 'Verify your email — ExamForge AI Newsletter', html, text }
}

// ─── Template: Contact Notification (to Sales Team) ─────────────────────────

export function contactNotification(
  data: ContactFormData
): { subject: string; html: string; text: string } {
  const fullName = `${data.firstName} ${data.lastName}`
  const priority = data.subject === 'demo' || data.subject === 'partnership' ? 'high'
    : data.subject === 'pricing' || data.subject === 'support' ? 'medium'
    : 'low'

  const html = wrapDocument(
    emailHeader('New Contact Submission') +
    emailContent(`
      ${heading('New Contact Submission')}
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px 0;">
        ${detailRow('Name:', fullName)}
        ${detailRow('Email:', `<a href="mailto:${data.email}" style="color:${BRAND_COLOR};">${data.email}</a>`)}
        ${data.phone ? detailRow('Phone:', data.phone) : ''}
        ${data.school ? detailRow('School:', data.school) : ''}
        ${data.institutionType ? detailRow('Type:', data.institutionType) : ''}
        ${detailRow('Subject:', data.subject)}
        ${detailRow('Priority:', `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;color:#fff;background:${priority === 'high' ? '#dc2626' : priority === 'medium' ? '#f59e0b' : '#10b981'};">${priority.toUpperCase()}</span>`)}
      </table>
      <div style="background:#f9fafb;padding:16px;border-radius:6px;border:1px solid #e5e7eb;margin:0 0 16px 0;">
        <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:600;color:#6b7280;">MESSAGE:</p>
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111827;">${data.message}</p>
      </div>
      <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr><td align="center" style="padding:8px 0;">${ctaButton(`${BRAND_URL}/admin/contacts`, 'View in CRM')}</td></tr>
      </table>
    `) +
    emailFooter()
  )

  const text = `New Contact Submission — ${BRAND_NAME}

Name: ${fullName}
Email: ${data.email}
Phone: ${data.phone ?? 'N/A'}
School: ${data.school ?? 'N/A'}
Institution Type: ${data.institutionType ?? 'N/A'}
Subject: ${data.subject}
Priority: ${priority.toUpperCase()}

Message:
${data.message}

View in CRM: ${BRAND_URL}/admin/contacts

— ${BRAND_NAME} System`

  return { subject: `[ExamForge AI] New Contact: ${data.subject}`, html, text }
}

// ─── Template: Contact Auto-Reply ───────────────────────────────────────────

export function contactAutoReply(
  name: string,
  email: string
): { subject: string; html: string; text: string } {
  const displayName = name || 'there'

  const html = wrapDocument(
    emailHeader('Thank You') +
    emailContent(`
      ${heading('Thank you for contacting us!')}
      ${paragraph(`Hi ${displayName},`)}
      ${paragraph(`Thank you for reaching out to <strong>${BRAND_NAME}</strong>. We've received your message and our team will get back to you within <strong>4 hours</strong> during business days.`)}
      ${paragraph('In the meantime, you might find these resources helpful:')}
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 20px 0;">
        <tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;"><a href="${BRAND_URL}/features" style="color:${BRAND_COLOR};text-decoration:none;">&#x1f4cb; &nbsp;Product Features</a></td></tr>
        <tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;"><a href="${BRAND_URL}/pricing" style="color:${BRAND_COLOR};text-decoration:none;">&#x1f4b2; &nbsp;Pricing Plans</a></td></tr>
        <tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;"><a href="${BRAND_URL}/demo" style="color:${BRAND_COLOR};text-decoration:none;">&#x1f3ac; &nbsp;Book a Demo</a></td></tr>
      </table>
      ${paragraph('If your inquiry is urgent, please call us at <a href="tel:+2348012345678" style="color:' + BRAND_COLOR + ';">+234 801 234 5678</a>.')}
      ${paragraph('Best regards,<br>The ExamForge AI Team')}
    `) +
    emailFooter(true, `${BRAND_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`)
  )

  const text = `Thank you for contacting ${BRAND_NAME}!

Hi ${displayName},

Thank you for reaching out. We've received your message and our team will get back to you within 4 hours during business days.

If your inquiry is urgent, please call us at +234 801 234 5678.

Best regards,
The ${BRAND_NAME} Team`

  return { subject: 'Thank you for contacting ExamForge AI', html, text }
}

// ─── Template: Demo Confirmation ────────────────────────────────────────────

export function demoConfirmation(
  data: DemoBookingFormData,
  bookingId: string
): { subject: string; html: string; text: string } {
  const html = wrapDocument(
    emailHeader('Demo Confirmed!') +
    emailContent(`
      ${heading('Your demo is confirmed!')
      }
      ${paragraph(`Hi ${data.name},`)}
      ${paragraph(`Your <strong>${BRAND_NAME}</strong> demo has been booked! Here are the details:`)}
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px 0;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
        <tr><td style="padding:16px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            ${detailRow('Date:', data.preferredDate)}
            ${detailRow('Time:', `${data.preferredTime} (${data.timezone})`)}
            ${detailRow('Company:', data.company)}
            ${detailRow('Role:', data.role)}
            ${detailRow('Team Size:', data.teamSize)}
            ${detailRow('Booking ID:', bookingId)}
          </table>
        </td></tr>
      </table>
      ${data.notes ? paragraph(`<strong>Notes:</strong> ${data.notes}`) : ''}
      ${paragraph('We\'ll send you a reminder 24 hours before your demo. Please ensure you have a stable internet connection and a quiet environment.')}
      ${paragraph('Best regards,<br>The ExamForge AI Team')}
    `) +
    emailFooter()
  )

  const text = `Your ${BRAND_NAME} Demo is Confirmed!

Hi ${data.name},

Your demo has been booked! Here are the details:

Date: ${data.preferredDate}
Time: ${data.preferredTime} (${data.timezone})
Company: ${data.company}
Role: ${data.role}
Team Size: ${data.teamSize}
Booking ID: ${bookingId}
${data.notes ? `Notes: ${data.notes}` : ''}

We'll send you a reminder 24 hours before your demo.

Best regards,
The ${BRAND_NAME} Team`

  return { subject: 'Your ExamForge AI Demo is Confirmed!', html, text }
}

// ─── Template: Demo Reminder (24h before) ───────────────────────────────────

export function demoReminder(
  data: DemoBookingFormData,
  bookingId: string
): { subject: string; html: string; text: string } {
  const html = wrapDocument(
    emailHeader('Demo Reminder') +
    emailContent(`
      ${heading('Your demo is tomorrow!')}
      ${paragraph(`Hi ${data.name},`)}
      ${paragraph(`This is a friendly reminder that your <strong>${BRAND_NAME}</strong> demo is scheduled for <strong>tomorrow</strong>.`)}
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 16px 0;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
        <tr><td style="padding:16px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            ${detailRow('Date:', data.preferredDate)}
            ${detailRow('Time:', `${data.preferredTime} (${data.timezone})`)}
            ${detailRow('Booking ID:', bookingId)}
          </table>
        </td></tr>
      </table>
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td align="center">${ctaButton(`${BRAND_URL}/demo`, 'Join Demo')}</td></tr>
      </table>
      ${paragraph('Need to reschedule? Simply reply to this email and we\'ll find a better time.')}
      ${paragraph('Best regards,<br>The ExamForge AI Team')}
    `) +
    emailFooter()
  )

  const text = `Reminder: Your ${BRAND_NAME} Demo is Tomorrow!

Hi ${data.name},

This is a reminder that your demo is scheduled for tomorrow:

Date: ${data.preferredDate}
Time: ${data.preferredTime} (${data.timezone})
Booking ID: ${bookingId}

Need to reschedule? Reply to this email.

Best regards,
The ${BRAND_NAME} Team`

  return { subject: 'Reminder: Your ExamForge AI Demo is Tomorrow', html, text }
}

// ─── Template: Follow-Up After Demo ─────────────────────────────────────────

export function followUpAfterDemo(
  name: string
): { subject: string; html: string; text: string } {
  const displayName = name || 'there'

  const html = wrapDocument(
    emailHeader('How Did It Go?') +
    emailContent(`
      ${heading('How did your demo go?')}
      ${paragraph(`Hi ${displayName},`)}
      ${paragraph(`We hope you enjoyed your <strong>${BRAND_NAME}</strong> demo! We'd love to hear your feedback and answer any questions you might have.`)}
      ${paragraph('Here are some ways to move forward:')}
      <table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 20px 0;">
        <tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;"><a href="${BRAND_URL}/pricing" style="color:${BRAND_COLOR};text-decoration:none;">&#x1f4b2; &nbsp;View Pricing Plans</a></td></tr>
        <tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;"><a href="${BRAND_URL}/contact" style="color:${BRAND_COLOR};text-decoration:none;">&#x1f4e7; &nbsp;Talk to Our Team</a></td></tr>
        <tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;"><a href="${BRAND_URL}/features" style="color:${BRAND_COLOR};text-decoration:none;">&#x2705; &nbsp;Explore Features</a></td></tr>
      </table>
      ${paragraph('Best regards,<br>The ExamForge AI Team')}
    `) +
    emailFooter(true)
  )

  const text = `How did your ${BRAND_NAME} demo go?

Hi ${displayName},

We hope you enjoyed your demo! We'd love to hear your feedback and answer any questions you might have.

- View Pricing: ${BRAND_URL}/pricing
- Talk to Our Team: ${BRAND_URL}/contact
- Explore Features: ${BRAND_URL}/features

Best regards,
The ${BRAND_NAME} Team`

  return { subject: 'How did your ExamForge AI demo go?', html, text }
}
