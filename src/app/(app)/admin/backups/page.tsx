'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import {
  Database,
  Download,
  Upload,
  Plus,
  Loader2,
  HardDrive,
  Calendar,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Settings,
  Trash2,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Backup Management Page
// ============================================================================
// List, create, restore, schedule, and download backups.
// Data fetched from /api/admin/backups.
// ============================================================================

interface Backup {
  id: string
  name: string
  type: 'auto' | 'manual'
  size: string
  sizeBytes: number
  createdAt: string
  status: 'completed' | 'in_progress' | 'failed'
  tables: number
  records: number
}

interface BackupSchedule {
  enabled: boolean
  frequency: string
  retentionDays: number
  lastRun: string
  nextRun: string
}

export default function BackupManagementPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/backups')
      if (!res.ok) throw new Error('Failed to fetch backups')
      const data = await res.json()
      setBackups(data.backups ?? [])
      setSchedule(data.schedule ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups')
      setBackups([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateBackup = async () => {
    setCreating(true)
    try {
      const res = await apiFetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      })
      if (!res.ok) throw new Error('Failed to create backup')
      const data = await res.json()

      setBackups(prev => [data.backup, ...prev])
      toast.success('Backup started', { description: 'This may take a few minutes.' })

      // Poll for completion
      const pollId = data.backup.id
      const pollInterval = setInterval(async () => {
        const pollRes = await fetch('/api/admin/backups')
        if (pollRes.ok) {
          const pollData = await pollRes.json()
          const updated = (pollData.backups ?? []).find((b: Backup) => b.id === pollId)
          if (updated && updated.status === 'completed') {
            setBackups(pollData.backups ?? [])
            toast.success('Backup completed successfully')
            clearInterval(pollInterval)
          }
        }
      }, 5000)

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000)
    } catch {
      toast.error('Failed to create backup')
    } finally {
      setCreating(false)
    }
  }

  const handleRestore = async (backupId: string) => {
    setRestoring(backupId)
    try {
      const res = await apiFetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backupId }),
      })
      if (!res.ok) throw new Error('Restore failed')
      toast.success('Restore initiated', { description: 'Database will be restored from the selected backup.' })
    } catch {
      toast.error('Restore failed')
    } finally {
      setRestoring(null)
    }
  }

  const handleDownload = async (backup: Backup) => {
    try {
      const res = await apiFetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download', backupId: backup.id }),
      })
      if (!res.ok) throw new Error('Download failed')
      toast.info('Download started', { description: `${backup.name} (${backup.size})` })
    } catch {
      toast.error('Download failed')
    }
  }

  const handleUpdateSchedule = async (updates: Partial<BackupSchedule>) => {
    if (!schedule) return
    const newSchedule = { ...schedule, ...updates }
    setSchedule(newSchedule)
    try {
      await apiFetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_schedule', ...updates }),
      })
    } catch {
      // Silently fail — schedule will sync on next fetch
    }
  }

  const handleSaveSchedule = async () => {
    try {
      await apiFetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_schedule',
          enabled: schedule?.enabled,
          frequency: schedule?.frequency,
          retentionDays: schedule?.retentionDays,
        }),
      })
      toast.success('Backup schedule updated')
    } catch {
      toast.error('Failed to update schedule')
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
          <h1 className="text-3xl font-bold tracking-tight">Backup Management</h1>
        </div>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-8 text-center">
          <XCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
          <h3 className="text-lg font-medium">Failed to load backups</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
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
          <h1 className="text-3xl font-bold tracking-tight">Backup Management</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Manage database backups, scheduling, and restoration.
          </p>
        </div>
        <Button onClick={handleCreateBackup} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Create Backup
        </Button>
      </div>

      {/* Schedule Settings */}
      {schedule && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Automatic Backup Schedule
            </CardTitle>
            <CardDescription>
              Configure automatic backup frequency and retention policy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Automatic Backups</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create backups on a schedule
                </p>
              </div>
              <Switch
                checked={schedule.enabled}
                onCheckedChange={(checked) => handleUpdateSchedule({ enabled: checked })}
              />
            </div>

            {schedule.enabled && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={schedule.frequency} onValueChange={(v) => handleUpdateSchedule({ frequency: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Retention (days)</Label>
                    <Input
                      type="number"
                      value={schedule.retentionDays}
                      onChange={(e) => handleUpdateSchedule({ retentionDays: parseInt(e.target.value) || 30 })}
                      min={1}
                      max={365}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Scheduled Run</Label>
                    <Input
                      value={new Date(schedule.nextRun).toLocaleString()}
                      readOnly
                      className="bg-muted forge-input-glow"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleSaveSchedule}>
                    <Settings className="h-4 w-4 mr-1" />
                    Save Schedule
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Backups List */}
      {backups.length === 0 ? (
        <EmptyState
          icon={<Database className="h-8 w-8" />}
          title="No Backups Yet"
          description="Create your first backup to protect your school's data. Backups include all exam records, student data, and system configurations."
          primaryAction={{
            label: 'Create Backup',
            icon: <Plus className="h-4 w-4" />,
            onClick: handleCreateBackup,
          }}
          helpLink={{
            label: 'Backup and restore guide',
            href: 'https://docs.examforge.ai/admin/backups',
          }}
        />
      ) : (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Backup Snapshots
            </CardTitle>
            <CardDescription>
              All backup snapshots including automatic and manual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {backups.map((backup, idx) => (
                <div key={backup.id}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                        backup.status === 'completed' ? 'bg-green-50 dark:bg-green-950 dark:bg-emerald-950/30' :
                        backup.status === 'in_progress' ? 'bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-950/30' :
                        'bg-destructive/10'
                      }`}>
                        {backup.status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : backup.status === 'in_progress' ? (
                          <Loader2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{backup.name}</span>
                          <Badge variant={backup.type === 'auto' ? 'secondary' : 'outline'} className="text-[10px]">
                            {backup.type === 'auto' ? 'Auto' : 'Manual'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{new Date(backup.createdAt).toLocaleString()}</span>
                          {backup.status === 'completed' && (
                            <>
                              <span>{backup.size}</span>
                              <span>{backup.tables} tables</span>
                              <span>{backup.records.toLocaleString()} records</span>
                            </>
                          )}
                          {backup.status === 'in_progress' && (
                            <span className="text-yellow-600 dark:text-yellow-400">Creating backup...</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {backup.status === 'completed' && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleDownload(backup)}>
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Download
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={!!restoring}>
                                <Upload className="h-3.5 w-3.5 mr-1" />
                                Restore
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Restore from Backup?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will replace the current database with data from &quot;{backup.name}&quot; created on {new Date(backup.createdAt).toLocaleDateString()}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRestore(backup.id)}>
                                  Restore
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                  {idx < backups.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
