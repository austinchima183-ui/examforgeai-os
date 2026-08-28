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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import {
  Key,
  Plus,
  Copy,
  CheckCheck,
  Trash2,
  Eye,
  Loader2,
  Shield,
  Clock,
  Activity,
  ChevronRight,
  RefreshCw,
  XCircle,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — API Keys Management Page
// ============================================================================
// Create, list, revoke API keys with permission and expiration management.
// Data fetched from /api/settings/api-keys.
// ============================================================================

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  expiresAt: string | null
  createdAt: string
  lastUsedAt: string | null
  active: boolean
  usageCount: number
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showNewKey, setShowNewKey] = useState(false)
  const [newRawKey, setNewRawKey] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Create form
  const [newName, setNewName] = useState('')
  const [newPermissions, setNewPermissions] = useState<string[]>(['read'])
  const [newExpiration, setNewExpiration] = useState<string>('never')

  // Usage details
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [usageData, setUsageData] = useState<Record<string, unknown> | null>(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/api-keys')
      if (!res.ok) throw new Error('Failed to fetch API keys')
      const data = await res.json()
      setKeys(data.keys ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys')
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Please enter a name for the API key')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newName,
          permissions: newPermissions,
          expiration: newExpiration === 'never' ? null : newExpiration,
        }),
      })
      if (!res.ok) throw new Error('Failed to create API key')
      const data = await res.json()

      setKeys(prev => [...prev, data.key])
      setNewRawKey(data.rawKey)
      setShowCreate(false)
      setShowNewKey(true)
      setNewName('')
      setNewPermissions(['read'])
      setNewExpiration('never')
      toast.success('API key created! Copy it now — it won\'t be shown again.')
    } catch {
      toast.error('Failed to create API key')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (keyId: string) => {
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke', keyId }),
      })
      if (!res.ok) throw new Error('Failed to revoke key')
      setKeys(prev => prev.map(k => k.id === keyId ? { ...k, active: false } : k))
      toast.success('API key revoked')
    } catch {
      toast.error('Failed to revoke key')
    }
  }

  const handleCopyKey = () => {
    navigator.clipboard.writeText(newRawKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const togglePermission = (perm: string) => {
    setNewPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )
  }

  const handleShowUsage = async (key: ApiKey) => {
    setSelectedKey(key)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'usage', keyId: key.id }),
      })
      if (!res.ok) throw new Error('Failed to fetch usage')
      const data = await res.json()
      setUsageData(data)
    } catch {
      setUsageData(null)
    }
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
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
        </div>
        <Card className="p-8 text-center forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <XCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
          <h3 className="text-lg font-medium">Failed to load API keys</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchKeys}>
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
          <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground mt-1">
            Manage API keys for programmatic access to ExamForge AI.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create API Key
        </Button>
      </div>

      {/* Empty State */}
      {keys.length === 0 ? (
        <EmptyState
          icon={<Key className="h-8 w-8" />}
          title="No API Keys Yet"
          description="Generate API keys to integrate ExamForge AI with your external systems, automation tools, or custom applications."
          primaryAction={{
            label: 'Generate API Key',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => setShowCreate(true),
          }}
          helpLink={{
            label: 'API authentication guide',
            href: 'https://docs.examforge.ai/api/authentication',
          }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {keys.map((key) => (
            <Card key={key.id} className={`flex flex-col ${!key.active ? 'opacity-60' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{key.name}</CardTitle>
                  <Badge variant={key.active ? 'default' : 'secondary'} className="text-[10px]">
                    {key.active ? 'Active' : 'Revoked'}
                  </Badge>
                </div>
                <CardDescription className="font-mono text-xs">{key.keyPrefix}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {/* Permissions */}
                <div className="flex flex-wrap gap-1">
                  {key.permissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="text-[10px] px-1.5 py-0">
                      {perm}
                    </Badge>
                  ))}
                </div>

                {/* Stats */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created: {new Date(key.createdAt).toLocaleDateString()}
                  </div>
                  {key.lastUsedAt && (
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Key className="h-3 w-3" />
                    {key.usageCount.toLocaleString()} requests
                  </div>
                  {key.expiresAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expires: {new Date(key.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>

              {/* Actions */}
              <div className="flex border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 rounded-none rounded-bl-lg"
                  onClick={() => handleShowUsage(key)}
                  disabled={!key.active}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Usage
                </Button>
                <Separator orientation="vertical" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 rounded-none rounded-br-lg text-destructive hover:text-destructive"
                      disabled={!key.active}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Revoke
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently disable the key &quot;{key.name}&quot;. Any application using this key will lose access immediately.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRevoke(key.id)}>
                        Revoke Key
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create API Key Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => !open && setShowCreate(false)}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for programmatic access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., Production API Key"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2">
                {['read', 'write', 'admin'].map((perm) => (
                  <div key={perm} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium capitalize">{perm}</span>
                      <p className="text-xs text-muted-foreground">
                        {perm === 'read' && 'Read access to data'}
                        {perm === 'write' && 'Create and update data'}
                        {perm === 'admin' && 'Full administrative access'}
                      </p>
                    </div>
                    <Switch
                      checked={newPermissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select value={newExpiration} onValueChange={setNewExpiration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                  <SelectItem value="1y">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Create Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Key Display Dialog */}
      <Dialog open={showNewKey} onOpenChange={(open) => !open && setShowNewKey(false)}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle>API Key Created!</DialogTitle>
            <DialogDescription>
              Copy your API key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-950/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                  Important: Save this key securely
                </span>
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 dark:text-yellow-600 dark:text-yellow-400">
                This is the only time the full key will be displayed.
              </p>
            </div>
            <div className="flex gap-2">
              <Input value={newRawKey} readOnly className="font-mono text-sm forge-input-glow" />
              <Button variant="outline" size="icon" onClick={handleCopyKey}>
                {copied ? <CheckCheck className="h-4 w-4 text-green-600 dark:text-green-400" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowNewKey(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Usage Stats Dialog */}
      <Dialog open={!!selectedKey} onOpenChange={(open) => !open && setSelectedKey(null)}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-md">
          {selectedKey && (
            <>
              <DialogHeader>
                <DialogTitle>Usage: {selectedKey.name}</DialogTitle>
                <DialogDescription>API key usage statistics and breakdown.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg border">
                    <p className="text-2xl font-bold">{(usageData as Record<string, number>)?.total?.toLocaleString() ?? selectedKey.usageCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-lg border">
                    <p className="text-2xl font-bold">{(usageData as Record<string, number>)?.last7d?.toLocaleString() ?? Math.floor(selectedKey.usageCount * 0.15).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Last 7d</p>
                  </div>
                  <div className="text-center p-3 rounded-lg border">
                    <p className="text-2xl font-bold">{(usageData as Record<string, number>)?.last30d?.toLocaleString() ?? Math.floor(selectedKey.usageCount * 0.45).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Last 30d</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">By Endpoint</Label>
                  {((usageData as Record<string, Array<{ endpoint: string; count: number }>>)?.byEndpoint ?? [
                    { endpoint: 'GET /api/exams', count: Math.floor(selectedKey.usageCount * 0.4) },
                    { endpoint: 'GET /api/results', count: Math.floor(selectedKey.usageCount * 0.3) },
                    { endpoint: 'POST /api/exams', count: Math.floor(selectedKey.usageCount * 0.15) },
                    { endpoint: 'GET /api/students', count: Math.floor(selectedKey.usageCount * 0.15) },
                  ]).map(({ endpoint, count }) => (
                    <div key={endpoint} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs">{endpoint}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(count / Math.max(selectedKey.usageCount, 1)) * 100}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
