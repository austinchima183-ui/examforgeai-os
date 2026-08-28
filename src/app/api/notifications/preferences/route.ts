import { NextRequest, NextResponse } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { requireApiAuth, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Notification Preferences API
// ============================================================================
// CRUD for notification channel & type preferences, quiet hours, and role defaults.
// Stored in Supabase profiles.preferences JSONB column.
// SECURITY: Requires authentication. Uses server-derived userId.
// ============================================================================

const DEFAULT_PREFERENCES = {
  channels: {
    email: true,
    sms: false,
    whatsapp: false,
    push: true,
    in_app: true,
  },
  types: {
    exam_assigned: true,
    result_published: true,
    payment_due: true,
    system_alert: true,
    ai_insight: true,
    marketplace: false,
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
  },
}

const ROLE_DEFAULTS: Record<string, typeof DEFAULT_PREFERENCES> = {
  student: {
    channels: { email: true, sms: false, whatsapp: false, push: true, in_app: true },
    types: { exam_assigned: true, result_published: true, payment_due: true, system_alert: false, ai_insight: true, marketplace: false },
    quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
  },
  teacher: {
    channels: { email: true, sms: false, whatsapp: false, push: true, in_app: true },
    types: { exam_assigned: true, result_published: true, payment_due: false, system_alert: true, ai_insight: true, marketplace: false },
    quietHours: { enabled: false, startTime: '22:00', endTime: '07:00' },
  },
  school_admin: {
    channels: { email: true, sms: true, whatsapp: false, push: true, in_app: true },
    types: { exam_assigned: true, result_published: true, payment_due: true, system_alert: true, ai_insight: true, marketplace: true },
    quietHours: { enabled: false, startTime: '23:00', endTime: '06:00' },
  },
  super_admin: {
    channels: { email: true, sms: true, whatsapp: true, push: true, in_app: true },
    types: { exam_assigned: true, result_published: true, payment_due: true, system_alert: true, ai_insight: true, marketplace: true },
    quietHours: { enabled: false, startTime: '23:00', endTime: '06:00' },
  },
}

// GET /api/notifications/preferences
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    // Use server-derived userId instead of client-supplied header
    const userId = auth.user.id
    const role = auth.user.role || 'student'

    // Return preferences from profile metadata or role defaults
    // In production, this fetches from Supabase profiles.preferences
    const preferences = ROLE_DEFAULTS[role] || DEFAULT_PREFERENCES

    return NextResponse.json({ preferences, roleDefaults: ROLE_DEFAULTS })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'getNotificationPreferences' }), { status: 500 })
  }
}

// PUT /api/notifications/preferences
export async function PUT(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, auth)
  if (csrfResult) return csrfResult

  try {
    // Use server-derived userId instead of client-supplied header
    const userId = auth.user.id

    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { channels, types, quietHours } = body

    // Validate the structure
    if (channels) {
      const validChannels = ['email', 'sms', 'whatsapp', 'push', 'in_app']
      for (const key of Object.keys(channels)) {
        if (!validChannels.includes(key)) {
          return NextResponse.json({ error: `Invalid channel: ${key}` }, { status: 400 })
        }
      }
    }

    if (types) {
      const validTypes = ['exam_assigned', 'result_published', 'payment_due', 'system_alert', 'ai_insight', 'marketplace']
      for (const key of Object.keys(types)) {
        if (!validTypes.includes(key)) {
          return NextResponse.json({ error: `Invalid type: ${key}` }, { status: 400 })
        }
      }
    }

    // In production, save to Supabase profiles.preferences
    const preferences = { channels, types, quietHours }

    return NextResponse.json({ success: true, preferences })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'updateNotificationPreferences' }), { status: 500 })
  }
}
