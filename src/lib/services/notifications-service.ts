// ============================================================================
// ExamForge AI — Notifications Data Service
// ============================================================================
// Real Supabase queries for notifications with Realtime support.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type { NotificationRow } from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string
  title: string
  description: string
  type: string
  priority: string | null
  read: boolean
  createdAt: string
  actionUrl: string | null
}

export interface NotificationsPageData {
  notifications: NotificationItem[]
  unreadCount: number
}

// ──────────────────────────────────────────────────────────────
// Get Notifications for Current User
// ──────────────────────────────────────────────────────────────

export async function getNotificationsData(userId: string): Promise<NotificationsPageData> {
  const supabase = await createClient()

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching notifications:', error)
    return { notifications: [], unreadCount: 0 }
  }

  const items: NotificationItem[] = (notifications ?? []).map(n => ({
    id: n.id,
    title: n.title,
    description: n.body,
    type: n.type,
    priority: n.priority,
    read: n.is_read,
    createdAt: n.created_at,
    actionUrl: n.action_url,
  }))

  const unreadCount = items.filter(n => !n.read).length

  return { notifications: items, unreadCount }
}

// ──────────────────────────────────────────────────────────────
// Mark Notification as Read
// ──────────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string, userId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId) // SECURITY: Prevent IDOR — users can only mark their own notifications

  if (error) {
    console.error('Error marking notification as read:', error)
    return { error: error.message }
  }

  return { error: null }
}

// ──────────────────────────────────────────────────────────────
// Mark All Notifications as Read
// ──────────────────────────────────────────────────────────────

export async function markAllNotificationsRead(userId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    return { error: error.message }
  }

  return { error: null }
}

// ──────────────────────────────────────────────────────────────
// Delete Notification
// ──────────────────────────────────────────────────────────────

export async function deleteNotification(notificationId: string, userId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId) // SECURITY: Prevent IDOR — users can only delete their own notifications

  if (error) {
    console.error('Error deleting notification:', error)
    return { error: error.message }
  }

  return { error: null }
}
