// ============================================================================
// ExamForge AI — Notification Template Engine
// ============================================================================
// Variable interpolation, locale fallback, and built-in templates for
// all notification types. Supports HTML + plain text + short (push/SMS)
// variants with {{variable}} syntax.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type {
  NotificationTemplate,
  NotificationType,
  SupportedLocale,
  TemplateVariables,
} from './types'

const log = createLogger('notifications:template-engine')

// ──────────────────────────────────────────────────────────────
// Template Registry
// ──────────────────────────────────────────────────────────────

/** In-memory template registry keyed by `${templateId}:${locale}`. */
const templateRegistry = new Map<string, NotificationTemplate>()

// ──────────────────────────────────────────────────────────────
// Variable Interpolation
// ──────────────────────────────────────────────────────────────

/**
 * Replace {{variable}} placeholders in a template string.
 * Handles nested dot-notation paths (e.g. {{user.name}}).
 * Missing variables are replaced with an empty string.
 *
 * @param template — Template string with {{variable}} placeholders
 * @param variables — Key-value map of template variables
 * @returns Rendered string with variables replaced
 */
export function interpolate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path: string) => {
    // Resolve dot-notation path
    const parts = path.split('.')
    let value: unknown = variables

    for (const part of parts) {
      if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[part]
      } else {
        value = undefined
        break
      }
    }

    if (value === undefined || value === null) {
      return ''
    }

    return String(value)
  })
}

// ──────────────────────────────────────────────────────────────
// Get Template (with locale fallback)
// ──────────────────────────────────────────────────────────────

/**
 * Get a template by ID and locale, with locale fallback.
 *
 * Fallback chain: requested locale → 'en' → first available locale.
 *
 * @param templateId — Template identifier
 * @param locale    — Requested locale
 * @returns The template, or null if not found
 */
export function getTemplate(templateId: string, locale: SupportedLocale): NotificationTemplate | null {
  // Try exact locale match
  const exactKey = `${templateId}:${locale}`
  const exact = templateRegistry.get(exactKey)
  if (exact) return exact

  // Fallback to English
  if (locale !== 'en') {
    const enKey = `${templateId}:en`
    const en = templateRegistry.get(enKey)
    if (en) {
      log.debug('Template locale fallback to en', { templateId, requestedLocale: locale })
      return en
    }
  }

  // Fallback to first available locale for this template
  for (const [key, template] of templateRegistry.entries()) {
    if (key.startsWith(`${templateId}:`)) {
      log.debug('Template locale fallback to first available', { templateId, requestedLocale: locale, fallbackLocale: template.locale })
      return template
    }
  }

  log.warn('Template not found', { templateId, locale })
  return null
}

// ──────────────────────────────────────────────────────────────
// Register Template
// ──────────────────────────────────────────────────────────────

/**
 * Register a new template or update an existing one.
 *
 * @param template — The template to register
 */
export function registerTemplate(template: NotificationTemplate): void {
  const key = `${template.id}:${template.locale}`
  templateRegistry.set(key, template)
  log.debug('Template registered', { templateId: template.id, locale: template.locale })
}

// ──────────────────────────────────────────────────────────────
// Render Template
// ──────────────────────────────────────────────────────────────

/** Rendered template with all variants. */
export interface RenderedTemplate {
  /** Rendered subject line. */
  subject: string
  /** Rendered HTML body. */
  htmlBody: string
  /** Rendered plain-text body. */
  textBody: string
  /** Rendered short body (for push/SMS). */
  shortBody: string
  /** The template that was used (after locale fallback). */
  template: NotificationTemplate
}

/**
 * Render a template with variable substitution and locale fallback.
 *
 * @param templateId — Template identifier
 * @param variables  — Variable values for interpolation
 * @param locale    — Requested locale (falls back to en)
 * @returns RenderedTemplate with all variants, or null if template not found
 */
export function renderTemplate(
  templateId: string,
  variables: TemplateVariables,
  locale: SupportedLocale = 'en'
): RenderedTemplate | null {
  const template = getTemplate(templateId, locale)
  if (!template) return null

  return {
    subject: interpolate(template.subject, variables),
    htmlBody: interpolate(template.htmlBody, variables),
    textBody: interpolate(template.textBody, variables),
    shortBody: interpolate(template.shortBody, variables),
    template,
  }
}

// ──────────────────────────────────────────────────────────────
// Built-in Templates
// ──────────────────────────────────────────────────────────────

const now = new Date().toISOString()

/** Built-in template definitions for all NotificationType values. */
const BUILT_IN_TEMPLATES: NotificationTemplate[] = [
  // ── Exam Reminder ──
  {
    id: 'exam_reminder',
    type: 'exam_reminder' as NotificationType,
    locale: 'en',
    subject: 'Exam Reminder: {{examName}}',
    htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2>Exam Reminder</h2>
  <p>Hi {{userName}},</p>
  <p>This is a reminder that your exam <strong>{{examName}}</strong> is scheduled for <strong>{{examDate}}</strong> at <strong>{{examTime}}</strong>.</p>
  <p>Duration: {{duration}} minutes</p>
  {{actionUrl}}
  <p>Good luck!</p>
  <p>— ExamForge AI</p>
</div>`,
    textBody: `Exam Reminder\n\nHi {{userName}},\n\nThis is a reminder that your exam "{{examName}}" is scheduled for {{examDate}} at {{examTime}}.\n\nDuration: {{duration}} minutes\n\nGood luck!\n— ExamForge AI`,
    shortBody: 'Exam "{{examName}}" starts {{examDate}} at {{examTime}}',
    defaultPriority: 'high',
    defaultChannels: ['in_app', 'push', 'email'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },

  // ── Exam Result ──
  {
    id: 'exam_result',
    type: 'exam_result' as NotificationType,
    locale: 'en',
    subject: 'Your Results for {{examName}} Are Ready',
    htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2>Exam Results Published</h2>
  <p>Hi {{userName}},</p>
  <p>Results for <strong>{{examName}}</strong> are now available.</p>
  <p>Your score: <strong>{{score}}%</strong> ({{grade}})</p>
  {{actionUrl}}
  <p>— ExamForge AI</p>
</div>`,
    textBody: `Exam Results\n\nHi {{userName}},\n\nResults for "{{examName}}" are now available.\nYour score: {{score}}% ({{grade}})\n\n— ExamForge AI`,
    shortBody: '{{examName}} results: {{score}}% ({{grade}})',
    defaultPriority: 'high',
    defaultChannels: ['in_app', 'push', 'email'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },

  // ── Payment Due ──
  {
    id: 'payment_due',
    type: 'payment' as NotificationType,
    locale: 'en',
    subject: 'Payment Due: {{amount}} for {{description}}',
    htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2>Payment Due</h2>
  <p>Hi {{userName}},</p>
  <p>A payment of <strong>{{amount}}</strong> for <strong>{{description}}</strong> is due by <strong>{{dueDate}}</strong>.</p>
  {{actionUrl}}
  <p>If you have already made this payment, please disregard this notice.</p>
  <p>— ExamForge AI</p>
</div>`,
    textBody: `Payment Due\n\nHi {{userName}},\n\nA payment of {{amount}} for "{{description}}" is due by {{dueDate}}.\n\n— ExamForge AI`,
    shortBody: 'Payment of {{amount}} due {{dueDate}}',
    defaultPriority: 'urgent',
    defaultChannels: ['in_app', 'push', 'email', 'sms'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },

  // ── Welcome ──
  {
    id: 'welcome',
    type: 'enrollment' as NotificationType,
    locale: 'en',
    subject: 'Welcome to ExamForge AI!',
    htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2>Welcome, {{userName}}! 🎉</h2>
  <p>Your ExamForge AI account is ready. You can now:</p>
  <ul>
    <li>Create and take exams</li>
    <li>Access AI-powered study tools</li>
    <li>View detailed analytics</li>
  </ul>
  {{actionUrl}}
  <p>— The ExamForge AI Team</p>
</div>`,
    textBody: `Welcome, {{userName}}!\n\nYour ExamForge AI account is ready. You can now create and take exams, access AI-powered study tools, and view detailed analytics.\n\n— The ExamForge AI Team`,
    shortBody: 'Welcome to ExamForge AI, {{userName}}!',
    defaultPriority: 'normal',
    defaultChannels: ['in_app', 'email'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },

  // ── Password Reset ──
  {
    id: 'password_reset',
    type: 'system' as NotificationType,
    locale: 'en',
    subject: 'Reset Your ExamForge AI Password',
    htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2>Password Reset</h2>
  <p>Hi {{userName}},</p>
  <p>We received a request to reset your password. Click the button below to set a new password:</p>
  <p><a href="{{resetUrl}}" style="background:#10b981;color:white;padding:12px 24px;text-decoration:none;border-radius:6px">Reset Password</a></p>
  <p>This link expires in {{expiryMinutes}} minutes.</p>
  <p>If you did not request this, please ignore this email.</p>
  <p>— ExamForge AI</p>
</div>`,
    textBody: `Password Reset\n\nHi {{userName}},\n\nWe received a request to reset your password.\nVisit this link to set a new password: {{resetUrl}}\n\nThis link expires in {{expiryMinutes}} minutes.\n\nIf you did not request this, please ignore this email.\n\n— ExamForge AI`,
    shortBody: 'Password reset requested. Link expires in {{expiryMinutes}} min.',
    defaultPriority: 'high',
    defaultChannels: ['email'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },

  // ── Enrollment ──
  {
    id: 'enrollment',
    type: 'enrollment' as NotificationType,
    locale: 'en',
    subject: 'Enrolled in {{courseName}}',
    htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2>Enrollment Confirmed</h2>
  <p>Hi {{userName}},</p>
  <p>You have been enrolled in <strong>{{courseName}}</strong>.</p>
  <p>Start date: {{startDate}}</p>
  {{actionUrl}}
  <p>— ExamForge AI</p>
</div>`,
    textBody: `Enrollment Confirmed\n\nHi {{userName}},\n\nYou have been enrolled in "{{courseName}}".\nStart date: {{startDate}}\n\n— ExamForge AI`,
    shortBody: 'Enrolled in {{courseName}} — starts {{startDate}}',
    defaultPriority: 'normal',
    defaultChannels: ['in_app', 'email'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },

  // ── AI Insight ──
  {
    id: 'ai_insight',
    type: 'ai_generation' as NotificationType,
    locale: 'en',
    subject: 'AI Insight: {{insightTitle}}',
    htmlBody: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <h2>AI Insight</h2>
  <p>Hi {{userName}},</p>
  <p><strong>{{insightTitle}}</strong></p>
  <p>{{insightSummary}}</p>
  {{actionUrl}}
  <p>— ExamForge AI</p>
</div>`,
    textBody: `AI Insight\n\nHi {{userName}},\n\n{{insightTitle}}\n{{insightSummary}}\n\n— ExamForge AI`,
    shortBody: '{{insightTitle}}: {{insightSummary}}',
    defaultPriority: 'low',
    defaultChannels: ['in_app'],
    active: true,
    createdAt: now,
    updatedAt: now,
  },
]

// ──────────────────────────────────────────────────────────────
// Initialize Built-in Templates
// ──────────────────────────────────────────────────────────────

/**
 * Register all built-in templates into the registry.
 * Called once at module initialisation.
 */
export function initializeBuiltInTemplates(): void {
  for (const template of BUILT_IN_TEMPLATES) {
    registerTemplate(template)
  }
  log.info('Built-in templates registered', { count: BUILT_IN_TEMPLATES.length })
}

// Auto-initialise on first import
initializeBuiltInTemplates()

// ──────────────────────────────────────────────────────────────
// Template ID Resolution
// ──────────────────────────────────────────────────────────────

/**
 * Resolve the default template ID for a notification type.
 * Used when no explicit templateId is provided in an event.
 *
 * @param type — Notification type
 * @returns Template ID string
 */
export function resolveTemplateId(type: NotificationType): string {
  // Map notification types to built-in template IDs
  const typeToTemplate: Partial<Record<NotificationType, string>> = {
    exam_reminder: 'exam_reminder',
    exam_result: 'exam_result',
    payment: 'payment_due',
    enrollment: 'enrollment',
    system: 'password_reset',
    ai_generation: 'ai_insight',
    assignment: 'exam_reminder', // reuse exam_reminder
    announcement: 'enrollment', // reuse enrollment layout
    message: 'exam_reminder', // reuse for generic messaging
    subscription: 'payment_due', // reuse payment_due
    marketplace: 'ai_insight', // reuse ai_insight layout
  }

  return typeToTemplate[type] ?? type
}

// ──────────────────────────────────────────────────────────────
// Get All Registered Templates
// ──────────────────────────────────────────────────────────────

/**
 * Get all registered templates (for admin/debug).
 */
export function getAllTemplates(): NotificationTemplate[] {
  return Array.from(templateRegistry.values())
}
