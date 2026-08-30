'use client'

import * as React from 'react'
import {
  Globe, Wifi, WifiOff, AlertTriangle, RefreshCw, Settings,
  CheckCircle, XCircle, Key, Webhook, Shield, ExternalLink,
  Zap, Clock, MoreVertical
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi, apiPut, apiPost } from '@/lib/hooks/use-api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

const INTEGRATION_META: Record<string, { icon: React.ReactNode; color: string; bg: string; description: string }> = {
  'Google Workspace': { icon: <Globe className="h-5 w-5" />, color: 'text-destructive', bg: 'bg-destructive/10', description: 'Sync users, calendar, and classroom data with Google' },
  'Microsoft 365': { icon: <Globe className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/10', description: 'Integrate with Microsoft Teams, OneDrive, and Outlook' },
  'WhatsApp Business': { icon: <Zap className="h-5 w-5" />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', description: 'Send notifications and alerts via WhatsApp' },
  'Termii SMS': { icon: <Zap className="h-5 w-5" />, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30', description: 'SMS gateway for Africa — send bulk SMS notifications' },
  'Flutterwave': { icon: <Key className="h-5 w-5" />, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30', description: 'Process fee payments via Flutterwave gateway' },
  'Paystack': { icon: <Key className="h-5 w-5" />, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30', description: 'Accept online payments via Paystack' },
}

const STATUS_CONFIG = {
  connected: { label: 'Connected', icon: <Wifi className="h-4 w-4" />, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950 dark:bg-emerald-900/30' },
  disconnected: { label: 'Disconnected', icon: <WifiOff className="h-4 w-4" />, color: 'text-foreground/60', bg: 'bg-gray-100 dark:bg-gray-900/30' },
  error: { label: 'Error', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-destructive', bg: 'bg-destructive/10' },
}

interface IntegrationRow {
  id: string; schoolId: string; name: string; type: string; status: string;
  config: string | null; lastSyncAt: string | null; error: string | null;
  createdAt: string; updatedAt: string;
}

export default function IntegrationsPage() {
  const { user } = useAuthStore()
  const { data: integrations, loading, error, refetch } = useApi<IntegrationRow[]>('/api/admin/integrations?schoolId=')
  const [configOpen, setConfigOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<IntegrationRow | null>(null)
  const [testing, setTesting] = React.useState<string | null>(null)

  // Get first school for query
  const schoolIntegrations = integrations || []

  const handleTest = async (integration: IntegrationRow) => {
    setTesting(integration.id)
    try {
      const result = await apiPost('/api/admin/integrations', { id: integration.id })
      toast.success(result.message || 'Test completed')
      refetch()
    } catch {
      toast.error('Connection test failed')
    } finally {
      setTesting(null)
    }
  }

  const handleSaveConfig = async () => {
    if (!selected) return
    try {
      await apiPut('/api/admin/integrations', {
        id: selected.id,
        config: JSON.parse(selected.config || '{}'),
        userId: user?.id || 'system',
      })
      toast.success('Configuration saved')
      setConfigOpen(false)
      refetch()
    } catch {
      toast.error('Failed to save configuration')
    }
  }

  const parseConfig = (config: string | null) => {
    if (!config) return {}
    try { return JSON.parse(config) } catch { return {} }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Globe className="h-7 w-7" /> Integration Hub</h1>
          <p className="text-sm text-muted-foreground">Connect external services and configure integrations</p>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = schoolIntegrations.filter(i => i.status === status).length
          return (
            <Card key={status} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.color}`}>{cfg.icon}</div>
                <div>
                  <div className="text-xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">{cfg.label}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Integration Cards */}
      {error && <div className="p-6 text-center text-destructive"><AlertTriangle className="h-5 w-5 inline mr-2" />{error}</div>}
      {loading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-lg" />)}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {schoolIntegrations.map(integration => {
          const meta = INTEGRATION_META[integration.name] || { icon: <Globe />, color: 'text-gray-600', bg: 'bg-gray-100', description: 'External service integration' }
          const statusCfg = STATUS_CONFIG[integration.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.disconnected
          const config = parseConfig(integration.config)

          return (
            <Card key={integration.id} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${meta.bg} ${meta.color}`}>{meta.icon}</div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <Badge variant="secondary" className={`${statusCfg.bg} ${statusCfg.color} border-0 gap-1 text-xs mt-1`}>
                        {statusCfg.icon} {statusCfg.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">{meta.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {integration.error && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />{integration.error}
                  </div>
                )}
                {integration.lastSyncAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Last synced: {new Date(integration.lastSyncAt).toLocaleString()}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" /> Type: {integration.type === 'oauth' ? 'OAuth 2.0' : 'API Key'}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline" size="sm" className="flex-1"
                    onClick={() => handleTest(integration)}
                    disabled={testing === integration.id}
                  >
                    {testing === integration.id ? (
                      <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Testing...</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-1" /> Test</>
                    )}
                  </Button>
                  <Button
                    variant="outline" size="sm" className="flex-1"
                    onClick={() => { setSelected(integration); setConfigOpen(true) }}
                  >
                    <Settings className="h-4 w-4 mr-1" /> Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-md forge-glass-elevated border-white/[0.06] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Configure {selected?.name}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Integration Type</Label>
                <div className="text-sm font-medium mt-1">{selected.type === 'oauth' ? 'OAuth 2.0' : 'API Key'}</div>
              </div>

              {selected.type === 'oauth' ? (
                <div className="space-y-3">
                  <div><Label>Client ID</Label><Input className="forge-input-glow" placeholder="Enter Client ID" /></div>
                  <div><Label>Client Secret</Label><Input className="forge-input-glow" type="password" placeholder="Enter Client Secret" /></div>
                  <div><Label>Redirect URI</Label><Input value={`${window.location.origin}/api/auth/callback`} readOnly className="bg-muted forge-input-glow" /></div>
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" /> Start OAuth Flow
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div><Label>API Key</Label><Input className="forge-input-glow" type="password" placeholder="Enter API Key" /></div>
                  <div><Label>Webhook URL</Label><Input className="forge-input-glow" placeholder="https://..." /></div>
                </div>
              )}

              <Separator />
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Sync Settings</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Auto-sync users</Label>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Sync on schedule</Label>
                  <Switch />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfigOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Separator() {
  return <div className="border-t my-2" />
}
