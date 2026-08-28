'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useNotificationStore } from '@/lib/stores/notification-store'
import { toast } from 'sonner'

// ============================================================================
// ExamForge AI — Realtime Provider
// ============================================================================
// Global realtime subscriptions mounted in the app layout.
// Handles: notifications, reconnection, error states, deduplication.
// Updates the notification store for the header badge count.
// ============================================================================

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { setUnreadCount, incrementUnread } = useNotificationStore()
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] | null>(null)
  const processedIdsRef = useRef(new Set<string>())

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return

    const supabase = createClient()
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (!error && count !== null) {
      setUnreadCount(count)
    }
  }, [user, setUnreadCount])

  useEffect(() => {
    if (!user) return

    // Fetch initial unread count
    fetchUnreadCount()

    const supabase = createClient()

    // Subscribe to notifications for the current user
    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: { id: string; title: string; body?: string } }) => {
          const newNotification = payload.new

          // Deduplication: skip if we've already processed this event
          if (processedIdsRef.current.has(newNotification.id)) return
          processedIdsRef.current.add(newNotification.id)

          // Clean up old entries to prevent memory leak
          if (processedIdsRef.current.size > 100) {
            const entries = Array.from(processedIdsRef.current)
            processedIdsRef.current = new Set(entries.slice(-50))
          }

          // Update unread count
          incrementUnread()

          // Show toast notification
          toast.info(newNotification.title, {
            description: newNotification.body,
            duration: 5000,
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (_payload: unknown) => {
          // Re-fetch unread count on any notification update (e.g., mark as read)
          fetchUnreadCount()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (_payload: unknown) => {
          // Re-fetch unread count on notification delete
          fetchUnreadCount()
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[RealtimeProvider] Channel error — will attempt to reconnect')
          // Supabase automatically retries, but we can log it
        }
        if (status === 'CLOSED') {
          console.warn('[RealtimeProvider] Channel closed — will attempt to reconnect')
        }
        if (status === 'SUBSCRIBED') {
          // Channel connected successfully
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user, fetchUnreadCount, incrementUnread])

  return <>{children}</>
}
