'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
  Users,
  Settings,
  Trash2,
  CheckCheck,
  Filter,
  DollarSign,
  Sparkles,
  GraduationCap,
} from 'lucide-react'
import { markNotificationReadAction, markAllNotificationsReadAction, deleteNotificationAction } from '@/features/notifications/actions'
import type { NotificationRow } from '@/lib/supabase/types'

// ============================================================================
// ExamForge AI — Notifications Page
// ============================================================================
// Client component with real Supabase Realtime subscriptions.
// No polling — uses onPostgresChange for live updates.
// Premium AI OS visual treatment applied.
// ============================================================================

type NotificationType = 'exam_reminder' | 'exam_result' | 'assignment' | 'announcement' | 'message' | 'subscription' | 'payment' | 'system' | 'ai_generation' | 'marketplace' | 'enrollment'

interface DisplayNotification {
  id: string
  title: string
  description: string
  type: string
  priority: string | null
  read: boolean
  createdAt: string
  actionUrl: string | null
}

const TYPE_ICONS: Record<string, typeof Bell> = {
  exam_reminder: FileText,
  exam_result: CheckCircle2,
  assignment: FileText,
  announcement: Info,
  message: Users,
  subscription: Settings,
  payment: DollarSign,
  system: Settings,
  ai_generation: Sparkles,
  marketplace: GraduationCap,
  enrollment: Users,
}

const TYPE_COLORS: Record<string, string> = {
  exam_reminder: 'text-primary bg-primary/10',
  exam_result: 'text-emerald-500 bg-emerald-500/10',
  assignment: 'text-primary bg-primary/10',
  announcement: 'text-foreground bg-muted',
  message: 'text-neural bg-neural/10',
  subscription: 'text-ember bg-ember/10',
  payment: 'text-emerald-500" bg-emeraldDollarSign/10',
  system: 'text-foreground bg-muted',
  ai_generation: 'text-primary bg-primary/10',
  marketplace: 'text-ember bg-ember/10',
  enrollment: 'text-neural bg-neural/10',
}

const TYPE_LABELS: Record<string, string> = {
  exam_reminder: 'Exams',
  exam_result: 'Results',
  assignment: 'Assignment',
  announcement: 'Announcement',
  message: 'Messages',
  subscription: 'Subscription',
  payment: 'Payment',
  system: 'System',
  ai_generation: 'AI',
  marketplace: 'Marketplace',
  enrollment: 'Enrollment',
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

type FilterTab = 'all' | 'unread' | 'mentions'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<DisplayNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Fetch initial notifications from Supabase
  const fetchNotifications = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase!.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching notifications:', error)
      setLoading(false)
      return
    }

    const items: DisplayNotification[] = ((data as NotificationRow[] | null) ?? []).map(n => ({
      id: n.id,
      title: n.title,
      description: n.body,
      type: n.type,
      priority: n.priority,
      read: n.is_read,
      createdAt: n.created_at,
      actionUrl: n.action_url,
    }))

    setNotifications(items)
    setLoading(false)
  }, [])

  // Subscribe to realtime notifications
  useEffect(() => {
    let cancelled = false
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null

    async function setup() {
      const supabase = createClient()
      const { data: { user } } = await supabase!.auth.getUser()
      if (!user || cancelled) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (cancelled) return

      if (error) {
        setLoading(false)
        return
      }

      const items: DisplayNotification[] = ((data as NotificationRow[] | null) ?? []).map(n => ({
        id: n.id,
        title: n.title,
        description: n.body,
        type: n.type,
        priority: n.priority,
        read: n.is_read,
        createdAt: n.created_at,
        actionUrl: n.action_url,
      }))

      setNotifications(items)
      setLoading(false)

      channel = supabase
        .channel('notifications-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload: { new: NotificationRow }) => {
            const newNotification = payload.new
            setNotifications(prev => {
              if (prev.some(n => n.id === newNotification.id)) return prev
              const display: DisplayNotification = {
                id: newNotification.id,
                title: newNotification.title,
                description: newNotification.body,
                type: newNotification.type,
                priority: newNotification.priority,
                read: newNotification.is_read,
                createdAt: newNotification.created_at,
                actionUrl: newNotification.action_url,
              }
              return [display, ...prev]
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
          (payload: { new: NotificationRow }) => {
            const updated = payload.new
            setNotifications(prev =>
              prev.map(n =>
                n.id === updated.id
                  ? {
                      ...n,
                      read: updated.is_read,
                      priority: updated.priority,
                    }
                  : n
              )
            )
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
          (payload: { old: { id: string } }) => {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            // Supabase will attempt to reconnect automatically
          }
        })
    }

    setup()

    return () => {
      cancelled = true
      if (channel) {
        const supabase = createClient()
        supabase.removeChannel(channel)
      }
    }
  }, [fetchNotifications])

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread' && n.read) return false
    if (filter === 'mentions' && n.type !== 'message' && n.type !== 'announcement') return false
    if (typeFilter !== 'all' && n.type !== typeFilter) return false
    return true
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
    await markNotificationReadAction(id)
  }

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await markAllNotificationsReadAction()
  }

  const handleDelete = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    await deleteNotificationAction(id)
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Stay updated with your latest activities and alerts.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight forge-gradient-text">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Stay updated with your latest activities and alerts.</p>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead} className="gap-2 hover:border-primary/50 transition-all duration-200">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
          <Badge variant="secondary" className="px-3 forge-glass-surface border-white/[0.04] forge-glow">
            {unreadCount} unread
          </Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg forge-glass-surface border-white/[0.04]">
          {(['all', 'unread', 'mentions'] as FilterTab[]).map((tab) => (
            <Button
              key={tab}
              variant={filter === tab ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(tab)}
              className={filter === tab ? 'forge-glow shadow-sm' : 'text-muted-foreground hover:text-foreground transition-all duration-200'}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 h-4 min-w-4 rounded-full bg-primary-foreground text-primary text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount}
                </span>
              )}
            </Button>
          ))}
        </div>

        <div className="h-4 w-px bg-border/40 mx-1" />

        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-9 rounded-lg border-white/[0.04] bg-[#1D1D1D]/50 px-3 text-sm text-foreground forge-input-glow focus:outline-none appearance-none cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="exam_reminder">Exams</option>
          <option value="exam_result">Results</option>
          <option value="system">System</option>
          <option value="message">Messages</option>
          <option value="payment">Payment</option>
          <option value="ai_generation">AI</option>
          <option value="marketplace">Marketplace</option>
        </select>
      </div>

      {/* Realtime indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <div className="relative flex h-2 w-2">
          <div className="absolute inset-0 rounded-full bg-emerald-500/40 animate-ping" />
          <div className="relative h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        Live — receiving updates in real-time
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-2xl" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl forge-glass-surface border-white/[0.04] forge-card-shadow">
              <Bell className="h-7 w-7 text-foreground/40" />
            </div>
          </div>
          <p className="text-base font-medium text-foreground">No notifications</p>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xs text-center">
            {filter === 'all' && typeFilter === 'all'
              ? "You're all caught up! New notifications will appear here in real-time."
              : `No matching notifications found.`}
          </p>
        </div>
      ) : (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-0 divide-y divide-border/20">
            {filteredNotifications.map((notification) => {
              const Icon = TYPE_ICONS[notification.type] ?? Bell
              const colorClass = TYPE_COLORS[notification.type] ?? 'text-muted-foreground bg-muted'

              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 transition-all duration-200 cursor-pointer group ${
                    notification.read ? 'hover:bg-secondary/30' : 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                  }`}
                  onClick={() => {
                    if (!notification.read) handleMarkAsRead(notification.id)
                  }}
                >
                  {/* Unread indicator */}
                  <div className="flex items-center gap-4 pt-1">
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow shrink-0" />
                    )}
                    {notification.read && (
                      <div className="h-2 w-2 shrink-0" />
                    )}
                  </div>

                  {/* Type icon in glass container */}
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border-white/[0.04] transition-all duration-200 ${!notification.read ? 'forge-glow' : ''} ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${notification.read ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                        {notification.title}
                      </p>
                      <span className="text-[11px] text-muted-foreground font-mono shrink-0">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-white/[0.04]">
                        {TYPE_LABELS[notification.type] ?? notification.type}
                      </Badge>
                      {notification.priority === 'high' && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          High
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id) }}
                        title="Mark as read"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(notification.id) }}
                      title="Delete notification"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
