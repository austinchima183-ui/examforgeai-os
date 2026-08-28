'use client'

import * as React from 'react'
import {
  Activity, Search, Filter, Download, Clock, User,
  Shield, Plus, Pencil, Trash2, LogIn, ChevronRight,
  AlertCircle, CalendarDays, FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useApi } from '@/lib/hooks/use-api'
import { toast } from 'sonner'

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  login: { label: 'Login', icon: <LogIn className="h-3 w-3" />, color: 'text-sky-700', bg: 'bg-sky-100 dark:bg-sky-900/30' },
  create: { label: 'Create', icon: <Plus className="h-3 w-3" />, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950 dark:bg-emerald-900/30' },
  update: { label: 'Update', icon: <Pencil className="h-3 w-3" />, color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-900/30' },
  delete: { label: 'Delete', icon: <Trash2 className="h-3 w-3" />, color: 'text-destructive', bg: 'bg-destructive/10' },
  role_change: { label: 'Role Change', icon: <Shield className="h-3 w-3" />, color: 'text-violet-700', bg: 'bg-violet-100 dark:bg-violet-900/30' },
}

interface AuditLogRow {
  id: string; userId: string | null; action: string; entity: string; entityId: string | null;
  details: string | null; ipAddress: string | null; createdAt: string;
  user: { id: string; fullName: string; email: string; role: string } | null;
}

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = React.useState('all')
  const [entityFilter, setEntityFilter] = React.useState('all')
  const [searchUser, setSearchUser] = React.useState('')
  const [selectedLog, setSelectedLog] = React.useState<AuditLogRow | null>(null)
  const [page, setPage] = React.useState(1)

  const queryParams = new URLSearchParams({ page: String(page), limit: '50' })
  if (actionFilter !== 'all') queryParams.set('action', actionFilter)
  if (entityFilter !== 'all') queryParams.set('entity', entityFilter)
  if (searchUser) queryParams.set('userId', searchUser)

  const { data, loading, error } = useApi<{ logs: AuditLogRow[]; total: number }>(
    `/api/admin/audit-logs?${queryParams.toString()}`
  )

  const handleExport = () => {
    if (!data?.logs) return
    const csv = ['Timestamp,User,Action,Entity,Entity ID,Details']
      .concat(data.logs.map(l =>
        `${l.createdAt},${l.user?.fullName || 'System'},${l.action},${l.entity},${l.entityId || ''},"${(l.details || '').replace(/"/g, '""')}"`
      ))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'audit-logs.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Audit logs exported')
  }

  const formatDetails = (details: string | null) => {
    if (!details) return null
    try {
      return JSON.parse(details)
    } catch {
      return details
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="h-6 w-6" /> Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Track all system actions and changes</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.logs?.length}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 forge-input-glow" placeholder="Search by user ID..." value={searchUser} onChange={e => setSearchUser(e.target.value)} />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Entity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="auth">Auth</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="exam">Exam</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
                <SelectItem value="integration">Integration</SelectItem>
                <SelectItem value="role_permission">Role Permission</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Object.entries(ACTION_CONFIG).map(([action, cfg]) => {
          const count = data?.logs?.filter(l => l.action === action).length ?? 0
          return (
            <Card key={action} className="cursor-pointer forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200" onClick={() => setActionFilter(action)}>
              <CardContent className="p-4 text-center">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${cfg.bg} ${cfg.color}`}>{cfg.icon}</div>
                <div className="text-xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{cfg.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Logs Table */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity Log ({data?.total ?? 0} entries)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <div className="p-6 text-center text-destructive"><AlertCircle className="h-5 w-5 inline mr-2" />{error}</div>}
          {loading && <div className="p-6 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
          {!loading && !data?.logs?.length && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-foreground/35" />
              <h3 className="mt-4 text-lg font-semibold">No audit logs found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Audit logs will appear here when users perform administrative actions.</p>
            </div>
          )}
          {data?.logs && data.logs.length > 0 && (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">Time</TableHead>
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">User</TableHead>
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">Action</TableHead>
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">Entity</TableHead>
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">Details</TableHead>
                    <TableHead className="w-12 sticky top-0 bg-background/95 backdrop-blur-sm" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map(log => {
                    const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.update
                    const parsed = formatDetails(log.details)
                    return (
                      <TableRow key={log.id} className="cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setSelectedLog(log)}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(log.createdAt).toLocaleString()}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{log.user?.fullName || 'System'}</div>
                          <div className="text-xs text-muted-foreground">{log.user?.role || ''}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${cfg.bg} ${cfg.color} border-0 gap-1 text-xs`}>
                            {cfg.icon} {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{log.entity}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {log.details ? (typeof parsed === 'object' ? JSON.stringify(parsed).slice(0, 60) : String(parsed).slice(0, 60)) : '—'}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.total && data.total > 50 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="py-2 text-sm text-muted-foreground">Page {page}</span>
          <Button variant="outline" size="sm" disabled={page * 50 >= data.total} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg forge-glass-elevated border-white/[0.06] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Audit Log Detail
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Timestamp:</span><div className="font-medium">{new Date(selectedLog.createdAt).toLocaleString()}</div></div>
                <div><span className="text-muted-foreground">User:</span><div className="font-medium">{selectedLog.user?.fullName || 'System'}</div></div>
                <div><span className="text-muted-foreground">Action:</span><div className="font-medium">{selectedLog.action}</div></div>
                <div><span className="text-muted-foreground">Entity:</span><div className="font-medium">{selectedLog.entity} {selectedLog.entityId && `(${selectedLog.entityId.slice(0, 8)}...)`}</div></div>
              </div>
              {selectedLog.details && (
                <div>
                  <span className="text-sm text-muted-foreground">Details:</span>
                  <ScrollArea className="h-48 mt-1">
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(formatDetails(selectedLog.details), null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
