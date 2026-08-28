// ============================================================================
// ExamForge AI — Notification Digest API
// ============================================================================
// POST /api/notifications/digest  — Trigger digest compilation for a user
// GET  /api/notifications/digest  — Get digest preview for the current user
// SECURITY: Requires authentication. Uses server-derived userId.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { requireApiAuth, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { processDigest } from '@/lib/notifications/delivery-engine'
import { sendEmail } from '@/lib/notifications/providers/email-resend'
import { createLogger } from '@/lib/observability/logger'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const log = createLogger('notifications:digest-api')

// ──────────────────────────────────────────────────────────────
// Input Validation
// ──────────────────────────────────────────────────────────────

const TriggerDigestSchema = z.object({
  /** Digest type: daily or weekly. */
  digestType: z.enum(['daily', 'weekly']).default('daily'),
  /** Whether to send the digest email after compilation. */
  sendEmail: z.boolean().default(true),
})

// ──────────────────────────────────────────────────────────────
// POST — Trigger Digest Compilation
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    const userId = auth.user.id

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(TriggerDigestSchema, rawBody)
    if ('error' in bodyResult) return bodyResult.error

    const { digestType, sendEmail: shouldSendEmail } = bodyResult.data

    log.info('Digest compilation triggered', { userId, digestType })

    // Compile the digest
    const digest = await processDigest(userId, digestType)

    if (!digest) {
      return NextResponse.json({
        success: true,
        message: 'No unread notifications for digest',
        digestType,
        totalUnread: 0,
      })
    }

    // Optionally send the digest via email
    if (shouldSendEmail && auth.user.email) {
      const emailResult = await sendEmail(
        auth.user.email,
        `${digestType === 'daily' ? 'Daily' : 'Weekly'} Digest — ${digest.totalUnread} unread`,
        digest.html,
        digest.text
      )

      if (!emailResult.success) {
        log.error('Failed to send digest email', undefined, {
          userId,
          digestType,
          error: emailResult.error,
        })
      }
    }

    return NextResponse.json({
      success: true,
      digestType,
      totalUnread: digest.totalUnread,
      groupCount: digest.summaries.length,
      periodStart: digest.periodStart,
      periodEnd: digest.periodEnd,
    })
  } catch (error) {
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'triggerDigest' }),
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// GET — Get Digest Preview
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const userId = auth.user.id
    const { searchParams } = new URL(request.url)
    const digestType = (searchParams.get('type') as 'daily' | 'weekly') ?? 'daily'

    // Compile the digest (without sending)
    const digest = await processDigest(userId, digestType)

    if (!digest) {
      return NextResponse.json({
        digestType,
        totalUnread: 0,
        summaries: [],
        html: null,
        text: null,
      })
    }

    return NextResponse.json({
      digestType,
      totalUnread: digest.totalUnread,
      summaries: digest.summaries.map(group => ({
        type: group.type,
        count: group.count,
        title: group.title,
        items: group.items.slice(0, 10), // Preview: max 10 items per group
      })),
      periodStart: digest.periodStart,
      periodEnd: digest.periodEnd,
      html: digest.html,
      text: digest.text,
    })
  } catch (error) {
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'getDigestPreview' }),
      { status: 500 }
    )
  }
}
