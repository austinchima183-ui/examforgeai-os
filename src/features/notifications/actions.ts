// ============================================================================
// ExamForge AI — Notification Server Actions
// ============================================================================
// All mutations verify the authenticated user and enforce ownership.

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthUser } from '@/lib/auth/require-auth'
import type { UserRole } from '@/lib/types'

export async function markNotificationReadAction(notificationId: string) {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  // Verify the notification belongs to the current user
  const { data: notification } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('id', notificationId)
    .single()

  if (!notification || notification.user_id !== user.id) {
    return { error: 'Notification not found or access denied' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', user.id) // SECURITY: defense-in-depth — prevent TOCTOU race

  if (!error) {
    revalidatePath('/notifications')
  }

  return { error: error?.message ?? null }
}

export async function markAllNotificationsReadAction() {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (!error) {
    revalidatePath('/notifications')
  }

  return { error: error?.message ?? null }
}

export async function deleteNotificationAction(notificationId: string) {
  const authResult = await getAuthUser()
  if (!authResult) return { error: 'Unauthorized' }

  const { user, supabase } = authResult

  // Verify the notification belongs to the current user
  const { data: notification } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('id', notificationId)
    .single()

  if (!notification || notification.user_id !== user.id) {
    return { error: 'Notification not found or access denied' }
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', user.id) // SECURITY: defense-in-depth — prevent TOCTOU race

  if (!error) {
    revalidatePath('/notifications')
  }

  return { error: error?.message ?? null }
}
