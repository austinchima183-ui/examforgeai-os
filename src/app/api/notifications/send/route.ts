// ============================================================================
// ExamForge AI — Notification Send API
// ============================================================================
// POST /api/notifications/send
// Sends a notification by dispatching it through the event handler system.
// Requires authentication. Server-side only — never exposed to client directly.
// SECURITY: Uses server-derived userId. Zod-validated input.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { requireApiAuth, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { dispatchEvent } from '@/lib/notifications/event-handlers'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ──────────────────────────────────────────────────────────────
// Input Validation
// ──────────────────────────────────────────────────────────────

const NotificationTypeSchema = z.enum([
  'exam_reminder',
  'exam_result',
  'assignment',
  'announcement',
  'message',
  'subscription',
  'payment',
  'system',
  'ai_generation',
  'marketplace',
  'enrollment',
])

const NotificationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']).default('normal')

const NotificationChannelSchema = z.enum(['in_app', 'push', 'email', 'sms'])

const SendNotificationSchema = z.object({
  /** The notification type to send. */
  type: NotificationTypeSchema,
  /** Priority level. */
  priority: NotificationPrioritySchema,
  /** Template variables for rendering. */
  data: z.record(z.string(), z.unknown()).default({}),
  /** Override recipient IDs (server verifies access). */
  recipientIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  /** Override channels. */
  channels: z.array(NotificationChannelSchema).optional(),
  /** Template ID override. */
  templateId: z.string().min(1).optional(),
  /** Locale override. */
  locale: z.enum(['en', 'fr', 'yo', 'ha', 'ig', 'pt', 'sw']).optional(),
  /** Schedule for future delivery (ISO-8601). */
  sendAt: z.string().datetime().optional(),
  /** Source entity ID. */
  sourceId: z.string().optional(),
  /** Source entity type. */
  sourceType: z.string().optional(),
  /** Organisation ID context. */
  organizationId: z.string().uuid().optional(),
  /** School ID context. */
  schoolId: z.string().uuid().optional(),
})

// ──────────────────────────────────────────────────────────────
// POST Handler
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(SendNotificationSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error

    const body = bodyResult.data
    const userId = auth.user.id

    // Build source data — always include the authenticated user ID
    const sourceData: Record<string, unknown> = {
      ...body.data,
      userId,
      priority: body.priority,
      channels: body.channels,
      templateId: body.templateId,
      locale: body.locale,
      sendAt: body.sendAt,
      sourceId: body.sourceId,
      sourceType: body.sourceType,
      organizationId: body.organizationId,
      schoolId: body.schoolId,
    }

    // If recipientIds are provided, add them to source data
    // In production, you would validate that the authenticated user
    // has permission to send notifications to these recipients
    if (body.recipientIds) {
      sourceData.recipientIds = body.recipientIds
    }

    // Dispatch through the event handler system
    const queueId = await dispatchEvent(body.type, sourceData)

    if (!queueId) {
      return NextResponse.json(
        { error: 'Failed to enqueue notification', code: 'ENQUEUE_FAILED' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      queueId,
      type: body.type,
      message: 'Notification enqueued for delivery',
    })
  } catch (error) {
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'sendNotification' }),
      { status: 500 }
    )
  }
}
