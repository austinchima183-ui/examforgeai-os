'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import {
  Globe,
  Plus,
  Trash2,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Edit3,
  Eye,
  Zap,
  RefreshCw,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Webhook Management Page
// ============================================================================
// Create, edit, test, delete webhooks. View delivery history.
// Data fetched from /api/settings/webhooks.
// ============================================================================

interface Webhook {
  id: string
  url: string
  events: string[]
  active: boolean
  secret: string
  createdAt: string
  updatedAt: string
  lastDeliveryAt: string | null
  lastDeliveryStatus: 'success' | 'failed' | null
}

interface Delivery {
  id: string
  webhookId: string
  event: string
  payload: string
  statusCode: number | null
  response: string | null
  duration: number | null
  status: 'success' | 'failed' | 'pending'
  timestamp: string
  retryAttempt: number
}

const AVAILABLE_EVENTS = [
  'exam.created', 'exam.updated', 'exam.deleted',
  'result.published', 'user.created', 'user.updated',
  'payment.completed', 'payment.failed',
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showDeliveries, setShowDeliveries] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Create form
  const [newUrl, setNewUrl] = useState('')
  const [newEvents, setNewEvents] = useState<string[]>([])

  // Edit form
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)
  const [editUrl, setEditUrl] = useState('')
  const [editEvents, setEditEvents] = useState<string[]>([])

  const fetchWebhooks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/webhooks')
      if (!res.ok) throw new Error('Failed to fetch webhooks')
      const data = await res.json()
      setWebhooks(data.webhooks ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load webhooks')
      setWebhooks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  const fetchDeliveries = async (webhookId: string) => {
    try {
      const res = await fetch(`/api/settings/webhooks?webhookId=${webhookId}`)
      if (!res.ok) throw new Error('Failed to fetch deliveries')
      const data = await res.json()
      setDeliveries(data.deliveries ?? [])
    } catch {
      setDeliveries([])
    }
  }

  const handleCreate = async () => {
    if (!newUrl.trim()) {
      toast.error('Please enter a URL')
      return
    }
    if (newEvents.length === 0) {
      toast.error('Please select at least one event')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', url: newUrl, events: newEvents }),
      })
      if (!res.ok) throw new Error('Failed to create webhook')
      const data = await res.json()
      setWebhooks(prev => [...prev, data.webhook])
      setShowCreate(false)
      setNewUrl('')
      setNewEvents([])
      toast.success('Webhook created successfully')
    } catch {
      toast.error('Failed to create webhook')
    } finally {
      setCreating(false)
    }
  }

  const handleTest = async (webhookId: string) => {
    setTesting(webhookId)
    try {
      const res = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', webhookId }),
      })
      if (!res.ok) throw new Error('Test delivery failed')
      const data = await res.json()
      toast.success('Test delivery sent', { description: `Status: ${data.statusCode} (${data.duration}ms)` })
    } catch {
      toast.error('Test delivery failed')
    } finally {
      setTesting(null)
    }
  }

  const handleToggleActive = async (webhookId: string) => {
    const webhook = webhooks.find(w => w.id === webhookId)
    if (!webhook) return
    try {
      const res = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', webhookId, active: !webhook.active }),
      })
      if (!res.ok) throw new Error('Failed to toggle webhook')
      setWebhooks(prev => prev.map(w =>
        w.id === webhookId ? { ...w, active: !w.active, updatedAt: new Date().toISOString() } : w
      ))
    } catch {
      toast.error('Failed to update webhook')
    }
  }

  const handleDelete = async (webhookId: string) => {
    try {
      const res = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', webhookId }),
      })
      if (!res.ok) throw new Error('Failed to delete webhook')
      setWebhooks(prev => prev.filter(w => w.id !== webhookId))
      toast.success('Webhook deleted')
    } catch {
      toast.error('Failed to delete webhook')
    }
  }

  const handleEdit = (webhook: Webhook) => {
    setEditingWebhook(webhook)
    setEditUrl(webhook.url)
    setEditEvents([...webhook.events])
  }

  const handleSaveEdit = async () => {
    if (!editingWebhook) return
    try {
      const res = await fetch('/api/settings/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', webhookId: editingWebhook.id, url: editUrl, events: editEvents }),
      })
      if (!res.ok) throw new Error('Failed to update webhook')
      setWebhooks(prev => prev.map(w =>
        w.id === editingWebhook.id
          ? { ...w, url: editUrl, events: editEvents, updatedAt: new Date().toISOString() }
          : w
      ))
      setEditingWebhook(null)
      toast.success('Webhook updated')
    } catch {
      toast.error('Failed to update webhook')
    }
  }

  const toggleEvent = (event: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(event) ? current.filter(e => e !== event) : [...current, event])
  }

  const handleShowDeliveries = async (webhookId: string) => {
    setShowDeliveries(webhookId)
    await fetchDeliveries(webhookId)
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
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
        </div>
        <Card className="p-8 text-center forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <XCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
          <h3 className="text-lg font-medium">Failed to load webhooks</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchWebhooks}>
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
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-1">
            Configure webhook endpoints to receive real-time event notifications.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Webhook
        </Button>
      </div>

      {/* Empty State */}
      {webhooks.length === 0 ? (
        <EmptyState
          icon={<Globe className="h-8 w-8" />}
          title="No Webhooks Configured"
          description="Set up webhook endpoints to receive real-time notifications when events like exam creation, result publication, or payment completion occur."
          primaryAction={{
            label: 'Add Webhook',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setShowCreate(true),
          }}
          helpLink={{
            label: 'Webhook integration guide',
            href: 'https://docs.examforge.ai/integrations/webhooks',
          }}
        />
      ) : (
        <div className="space-y-4 animate-fade-in">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm truncate">{webhook.url}</span>
                      <Badge variant={webhook.active ? 'default' : 'secondary'} className="text-[10px]">
                        {webhook.active ? 'Active' : 'Paused'}
                      </Badge>
                      {webhook.lastDeliveryStatus && (
                        <Badge
                          variant={webhook.lastDeliveryStatus === 'success' ? 'default' : 'destructive'}
                          className="text-[10px]"
                        >
                          {webhook.lastDeliveryStatus === 'success' ? (
                            <><CheckCircle2 className="h-3 w-3 mr-0.5" /> Healthy</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-0.5" /> Failing</>
                          )}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-[10px] px-1.5 py-0">
                          <Zap className="h-3 w-3 mr-0.5" />
                          {event}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {new Date(webhook.createdAt).toLocaleDateString()}</span>
                      {webhook.lastDeliveryAt && (
                        <span>Last delivery: {new Date(webhook.lastDeliveryAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={webhook.active}
                      onCheckedChange={() => handleToggleActive(webhook.id)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(webhook.id)}
                      disabled={testing === webhook.id || !webhook.active}
                    >
                      {testing === webhook.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(webhook)}>
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShowDeliveries(webhook.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove this webhook endpoint. Event deliveries will stop immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(webhook.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Webhook Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && setShowCreate(false)}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Set up a new webhook endpoint to receive event notifications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                placeholder="https://api.example.com/webhooks"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {AVAILABLE_EVENTS.map((event) => (
                  <div key={event} className="flex items-center gap-2">
                    <Checkbox
                      id={`event-${event}`}
                      checked={newEvents.includes(event)}
                      onCheckedChange={() => toggleEvent(event, newEvents, setNewEvents)}
                    />
                    <Label htmlFor={`event-${event}`} className="text-sm font-mono cursor-pointer">
                      {event}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newUrl.trim() || newEvents.length === 0}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Webhook Dialog */}
      <Dialog open={!!editingWebhook} onOpenChange={(open) => !open && setEditingWebhook(null)}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>Update endpoint URL and events.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {AVAILABLE_EVENTS.map((event) => (
                  <div key={event} className="flex items-center gap-2">
                    <Checkbox
                      checked={editEvents.includes(event)}
                      onCheckedChange={() => toggleEvent(event, editEvents, setEditEvents)}
                    />
                    <Label className="text-sm font-mono cursor-pointer">{event}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingWebhook(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delivery History Dialog */}
      <Dialog open={!!showDeliveries} onOpenChange={(open) => !open && setShowDeliveries(null)}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Delivery History</DialogTitle>
            <DialogDescription>Recent webhook deliveries with status and response details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {deliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No deliveries found.</p>
            ) : (
              deliveries.map((delivery) => (
                <div key={delivery.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-mono">{delivery.event}</Badge>
                      <Badge
                        variant={delivery.status === 'success' ? 'default' : 'destructive'}
                        className="text-[10px]"
                      >
                        {delivery.statusCode ?? 'No response'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(delivery.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Duration:</span> {delivery.duration}ms
                    </div>
                    <div>
                      <span className="text-muted-foreground">Retry:</span> {delivery.retryAttempt}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Payload:</p>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{delivery.payload}</pre>
                  </div>
                  {delivery.response && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground">Response:</p>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{delivery.response}</pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
