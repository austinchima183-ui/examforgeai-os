import { NextRequest, NextResponse } from 'next/server'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { requireApiAuth, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { z } from 'zod'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Notification History API
// ============================================================================
// Fetch, filter, resend, and export notification history.
// Queries Supabase notification_history table when available.
// SECURITY: Requires authentication.
// ============================================================================

interface HistoryEntry {
  id: string
  userId: string
  type: string
  channel: string
  status: 'sent' | 'failed' | 'pending'
  recipient: string
  subject: string
  body: string
  sentAt: string
  deliveredAt: string | null
  error: string | null
  retryCount: number
}

async function getSupabaseClient() {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    return await createClient()
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    // Try Supabase first
    const sb = await getSupabaseClient()
    if (sb) {
      let query = sb
        .from('notification_history')
        .select('*')
        .order('sent_at', { ascending: false })

      if (type && type !== 'all') query = query.eq('type', type)
      if (channel && channel !== 'all') query = query.eq('channel', channel)
      if (status && status !== 'all') query = query.eq('status', status)
      if (fromDate) query = query.gte('sent_at', fromDate)
      if (toDate) query = query.lte('sent_at', toDate)

      const result = await query
      if (result.error) {
        console.error('Supabase query error:', result.error)
      } else if (result.data) {
        const history: HistoryEntry[] = result.data.map((row: Record<string, unknown>) => ({
          id: row.id as string,
          userId: row.user_id as string,
          type: row.type as string,
          channel: row.channel as string,
          status: row.status as 'sent' | 'failed' | 'pending',
          recipient: row.recipient as string,
          subject: row.subject as string,
          body: row.body as string,
          sentAt: row.sent_at as string,
          deliveredAt: (row.delivered_at as string) ?? null,
          error: (row.error as string) ?? null,
          retryCount: (row.retry_count as number) ?? 0,
        }))
        return NextResponse.json({ history, total: history.length })
      }
    }

    // No Supabase data available — return empty
    return NextResponse.json({ history: [], total: 0 })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'getNotificationHistory' }), { status: 500 })
  }
}

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
    const bodyResult = validateInput(z.object({ action: z.string().min(1).optional(), data: z.any().optional() }).passthrough(), rawBody)
    if ('error' in bodyResult) return bodyResult.error
    const body = bodyResult.data
    const { action, id } = body

    if (action === 'resend' && id) {
      const sb = await getSupabaseClient()
      if (sb) {
        await sb
          .from('notification_history')
          .update({ status: 'pending', error: null })
          .eq('id', id)
      }
      return NextResponse.json({ success: true, message: 'Notification resent' })
    }

    if (action === 'export') {
      const sb = await getSupabaseClient()
      if (sb) {
        const result = await sb
          .from('notification_history')
          .select('*')
          .order('sent_at', { ascending: false })

        if (result.data && result.data.length > 0) {
          const csvHeader = 'ID,Type,Channel,Status,Recipient,Subject,Sent At,Delivered At,Error,Retries'
          const csvRows = result.data.map((h: Record<string, unknown>) =>
            `${h.id},${h.type},${h.channel},${h.status},${h.recipient},"${h.subject}",${h.sent_at},${h.delivered_at || ''},${h.error || ''},${h.retry_count ?? 0}`
          )
          const csv = [csvHeader, ...csvRows].join('\n')
          return NextResponse.json({ csv })
        }
      }
      return NextResponse.json({ csv: '' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(createSafeErrorResponse(error, { action: 'postNotificationHistory' }), { status: 500 })
  }
}
