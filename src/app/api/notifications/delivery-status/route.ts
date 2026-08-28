// ============================================================================
// ExamForge AI — Notification Delivery Status API
// ============================================================================
// GET /api/notifications/delivery-status
// Query delivery status for a specific notification or across notifications.
// Requires authentication. Uses server-derived userId for IDOR protection.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, createSafeErrorResponse } from '@/lib/api/auth-guard'
import { validatePagination } from '@/lib/api/validate'
import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import type { DeliveryStatus, NotificationChannel } from '@/lib/notifications/types'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

const log = createLogger('notifications:delivery-status-api')

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface DeliveryStatusEntry {
  id: string
  notificationId: string
  channel: NotificationChannel
  provider: string
  status: DeliveryStatus
  recipientAddress: string
  attemptCount: number
  providerId: string | null
  sentAt: string | null
  deliveredAt: string | null
  lastError: string | null
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// GET Handler
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request)
  if (auth instanceof NextResponse) return auth

  try {
    const userId = auth.user.id
    const { searchParams } = new URL(request.url)

    // Query parameters
    const notificationId = searchParams.get('notificationId')
    const channel = searchParams.get('channel')
    const status = searchParams.get('status')
    const { page, limit, offset } = validatePagination(searchParams)

    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }

    // If a specific notification ID is provided, query directly
    if (notificationId) {
      // First verify the notification belongs to the user (IDOR protection)
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .select('id')
        .eq('id', notificationId)
        .eq('user_id', userId) // SECURITY: IDOR protection
        .single()

      if (notifError || !notification) {
        return NextResponse.json(
          { error: 'Notification not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      // Fetch delivery records for this notification
      let query = supabase
        .from('notification_delivery_log')
        .select('*')
        .eq('notification_id', notificationId)
        .order('created_at', { ascending: false })

      if (channel) query = query.eq('channel', channel)
      if (status) query = query.eq('status', status)

      const { data: deliveries, error: deliveryError } = await query

      if (deliveryError) {
        log.error('Failed to fetch delivery status', deliveryError, { notificationId })
        return NextResponse.json(
          { error: 'Failed to fetch delivery status' },
          { status: 500 }
        )
      }

      const entries: DeliveryStatusEntry[] = (deliveries ?? []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        notificationId: d.notification_id as string,
        channel: d.channel as NotificationChannel,
        provider: d.provider as string,
        status: d.status as DeliveryStatus,
        recipientAddress: d.recipient_address as string,
        attemptCount: (d.attempt_count as number) ?? 0,
        providerId: (d.provider_id as string) ?? null,
        sentAt: (d.sent_at as string) ?? null,
        deliveredAt: (d.delivered_at as string) ?? null,
        lastError: (d.last_error as string) ?? null,
        createdAt: d.created_at as string,
      }))

      return NextResponse.json({
        deliveries: entries,
        notificationId,
        total: entries.length,
      })
    }

    // General query: fetch delivery records for all of the user's notifications
    // First get the user's notification IDs (paginated)
    const { data: userNotifications, error: notifsError } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId) // SECURITY: IDOR protection
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (notifsError || !userNotifications || userNotifications.length === 0) {
      return NextResponse.json({
        deliveries: [],
        total: 0,
        page,
        limit,
      })
    }

    const notificationIds = userNotifications.map((n: Record<string, unknown>) => n.id as string)

    // Fetch delivery records for these notifications
    let query = supabase
      .from('notification_delivery_log')
      .select('*')
      .in('notification_id', notificationIds)
      .order('created_at', { ascending: false })

    if (channel) query = query.eq('channel', channel)
    if (status) query = query.eq('status', status)

    const { data: deliveries, error: deliveryError } = await query

    if (deliveryError) {
      log.error('Failed to fetch delivery statuses', deliveryError, { userId })
      return NextResponse.json(
        { error: 'Failed to fetch delivery statuses' },
        { status: 500 }
      )
    }

    const entries: DeliveryStatusEntry[] = (deliveries ?? []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      notificationId: d.notification_id as string,
      channel: d.channel as NotificationChannel,
      provider: d.provider as string,
      status: d.status as DeliveryStatus,
      recipientAddress: d.recipient_address as string,
      attemptCount: (d.attempt_count as number) ?? 0,
      providerId: (d.provider_id as string) ?? null,
      sentAt: (d.sent_at as string) ?? null,
      deliveredAt: (d.delivered_at as string) ?? null,
      lastError: (d.last_error as string) ?? null,
      createdAt: d.created_at as string,
    }))

    return NextResponse.json({
      deliveries: entries,
      total: entries.length,
      page,
      limit,
    })
  } catch (error) {
    return NextResponse.json(
      createSafeErrorResponse(error, { action: 'getDeliveryStatus' }),
      { status: 500 }
    )
  }
}
