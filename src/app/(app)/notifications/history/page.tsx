'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Monitor,
  Globe,
  RefreshCw,
  Download,
  Filter,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Search,
  Send,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Notification History Page
// ============================================================================
// Chronological log of all sent notifications with filters, resend, and export.
// Data fetched from /api/notifications/history (backed by Supabase).
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

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: Smartphone,
  push: Globe,
  in_app: Monitor,
}

const STATUS_CONFIG = {
  sent: { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950', label: 'Sent' },
  failed: { icon: XCircle, color: 'text-destructive bg-destructive/10', label: 'Failed' },
  pending: { icon: Clock, color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950', label: 'Pending' },
}

const TYPE_LABELS: Record<string, string> = {
  exam_assigned: 'Exam Assigned',
  result_published: 'Result Published',
  payment_due: 'Payment Due',
  system_alert: 'System Alert',
  ai_insight: 'AI Insight',
  marketplace: 'Marketplace',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function NotificationHistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterChannel, setFilterChannel] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)
  const [resending, setResending] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (filterChannel !== 'all') params.set('channel', filterChannel)
      if (filterStatus !== 'all') params.set('status', filterStatus)

      const res = await fetch(`/api/notifications/history?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch notification history')
      const data = await res.json()
      setHistory(data.history ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notification history')
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [filterType, filterChannel, filterStatus])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const filteredHistory = history.filter(entry => {
    if (searchQuery && !entry.subject.toLowerCase().includes(searchQuery.toLowerCase()) && !entry.recipient.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handleResend = async (entry: HistoryEntry) => {
    setResending(entry.id)
    try {
      const res = await apiFetch('/api/notifications/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', id: entry.id }),
      })
      if (!res.ok) throw new Error('Resend failed')
      setHistory(prev => prev.map(h => h.id === entry.id ? { ...h, status: 'pending' as const, error: null } : h))
      toast.success('Notification queued for resend')
    } catch {
      toast.error('Failed to resend notification')
    } finally {
      setResending(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const csvHeader = 'ID,Type,Channel,Status,Recipient,Subject,Sent At,Delivered At,Error,Retries'
      const csvRows = filteredHistory.map(h =>
        `${h.id},${h.type},${h.channel},${h.status},${h.recipient},"${h.subject}",${h.sentAt},${h.deliveredAt || ''},${h.error || ''},${h.retryCount}`
      )
      const csv = [csvHeader, ...csvRows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `notification-history-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('History exported as CSV')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const statusCounts = {
    sent: history.filter(h => h.status === 'sent').length,
    failed: history.filter(h => h.status === 'failed').length,
    pending: history.filter(h => h.status === 'pending').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification History</h1>
        </div>
        <Card className="p-8 text-center forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <XCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
          <h3 className="text-lg font-medium">Failed to load history</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchHistory}>
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification History</h1>
          <p className="text-muted-foreground mt-1">
            Complete log of all sent notifications with delivery status.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting || history.length === 0}>
          {exporting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
          Export CSV
        </Button>
      </div>

      {/* Empty State */}
      {history.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title="No Notification History Yet"
          description="Notifications will appear here once you send exams results, payment reminders, or system alerts to students and parents."
          primaryAction={{
            label: 'Send Your First Notification',
            icon: <Send className="h-4 w-4" />,
            href: '/notifications/send',
          }}
          aiSuggestion={{
            text: 'AI can suggest the best time to send notifications',
          }}
          helpLink={{
            label: 'Notification setup guide',
            href: 'https://docs.examforge.ai/notifications',
          }}
        />
      ) : (
        <>
          {/* Status Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            {(['sent', 'failed', 'pending'] as const).map((status) => {
              const config = STATUS_CONFIG[status]
              const StatusIcon = config.icon
              return (
                <Card key={status}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${config.color}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{statusCounts[status]}</p>
                      <p className="text-xs text-muted-foreground">{config.label}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Filters */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by subject or recipient..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="exam_assigned">Exam Assigned</SelectItem>
                    <SelectItem value="result_published">Result Published</SelectItem>
                    <SelectItem value="payment_due">Payment Due</SelectItem>
                    <SelectItem value="system_alert">System Alert</SelectItem>
                    <SelectItem value="ai_insight">AI Insight</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterChannel} onValueChange={setFilterChannel}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="in_app">In-App</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* History List */}
          {filteredHistory.length === 0 ? (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardContent className="p-8 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No notifications found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters to see more results.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <div className="divide-y">
                {filteredHistory.map((entry) => {
                  const ChannelIcon = CHANNEL_ICONS[entry.channel] || Bell
                  const statusConfig = STATUS_CONFIG[entry.status]
                  const StatusIcon = statusConfig.icon

                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${statusConfig.color}`}>
                        <ChannelIcon className="h-4 w-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium truncate">{entry.subject}</h4>
                          <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${statusConfig.color.split(' ')[0]}`} />
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {TYPE_LABELS[entry.type] || entry.type}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {entry.channel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {entry.recipient}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>{formatTime(entry.sentAt)}</span>
                          {entry.error && (
                            <span className="text-destructive">{entry.error}</span>
                          )}
                          {entry.retryCount > 0 && (
                            <span>Retries: {entry.retryCount}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {entry.status === 'failed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={resending === entry.id}
                            onClick={(e) => { e.stopPropagation(); handleResend(entry) }}
                            title="Resend notification"
                          >
                            {resending === entry.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-lg">
          {selectedEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">Notification Details</DialogTitle>
                <DialogDescription>Full details for this notification delivery.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Type:</span> {TYPE_LABELS[selectedEntry.type]}</div>
                  <div><span className="text-muted-foreground">Channel:</span> {selectedEntry.channel}</div>
                  <div><span className="text-muted-foreground">Status:</span> <Badge variant={selectedEntry.status === 'sent' ? 'default' : selectedEntry.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">{selectedEntry.status}</Badge></div>
                  <div><span className="text-muted-foreground">Retries:</span> {selectedEntry.retryCount}</div>
                </div>
                <Separator />
                <div><span className="text-muted-foreground">Subject:</span> <span className="font-medium">{selectedEntry.subject}</span></div>
                <div><span className="text-muted-foreground">Recipient:</span> {selectedEntry.recipient}</div>
                <div><span className="text-muted-foreground">Sent:</span> {new Date(selectedEntry.sentAt).toLocaleString()}</div>
                {selectedEntry.deliveredAt && <div><span className="text-muted-foreground">Delivered:</span> {new Date(selectedEntry.deliveredAt).toLocaleString()}</div>}
                {selectedEntry.error && <div className="text-destructive"><span className="text-muted-foreground">Error:</span> {selectedEntry.error}</div>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
