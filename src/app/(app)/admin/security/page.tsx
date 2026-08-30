'use client'

import { useState, useMemo } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import {
  Shield, Key, Fingerprint, Monitor, Smartphone, FileText,
  Lock, AlertTriangle, CheckCircle, XCircle, Search, Plus,
  Clock, Globe, Zap, Trash2, Settings2, Eye, RefreshCw
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'

// ── SSO Provider type ────────────────────────────────────────
interface SsoProvider {
  id: string
  type: string
  name: string
  icon: string
  enabled: boolean
  status: 'active' | 'inactive'
  users: number
  lastSync: string
  domain: string
}

interface PasskeyStats {
  total: number
  registered: number
  usedToday: number
  avgAuthTime: string
  platforms: Record<string, number>
}

interface AccessPolicy {
  id: string
  name: string
  enabled: boolean
  priority: number
  conditions: string
  action: string
  scope: string
}

interface DeviceInfo {
  id: string
  name: string
  os: string
  type: string
  trust: string
  compliant: boolean
  lastSeen: string
  user: string
  enrolled: string
}

interface SessionInfo {
  id: string
  user: string
  email: string
  device: string
  ip: string
  location: string
  mfaVerified: boolean
  lastActive: string
  duration: string
  browser: string
}

interface AuditEntry {
  id: string
  action: string
  resource: string
  user: string
  result: 'success' | 'denied'
  risk: number
  time: string
  ip: string
  details: string
}

interface SecurityData {
  ssoProviders: SsoProvider[]
  passkeys: PasskeyStats
  policies: AccessPolicy[]
  devices: DeviceInfo[]
  sessions: SessionInfo[]
  auditLog: AuditEntry[]
}

// ── Fallback defaults (used until API data loads) ───────────

const DEFAULT_DEVICES: DeviceInfo[] = []
const DEFAULT_SESSIONS: SessionInfo[] = []
const DEFAULT_AUDIT_LOG: AuditEntry[] = []

// ── Style Maps ───────────────────────────────────────────────

const TRUST_COLORS: Record<string, string> = {
  none: 'bg-destructive/10 text-red-800 dark:bg-red-900 dark:text-red-200',
  basic: 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  compliant: 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  highly_trusted: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
}

const TRUST_LABELS: Record<string, string> = {
  none: 'None',
  basic: 'Basic',
  compliant: 'Compliant',
  highly_trusted: 'Highly Trusted',
}

// ── Main Component ───────────────────────────────────────────

export default function EnterpriseSecurityPage() {
  const [auditSearch, setAuditSearch] = useState('')
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [auditResultFilter, setAuditResultFilter] = useState('all')
  const [configureProvider, setConfigureProvider] = useState<string | null>(null)

  const { data: securityData, loading: isLoading, error } = useApi<SecurityData>('/api/security')
  const SSO_PROVIDERS = securityData?.ssoProviders ?? []
  const PASSKEYS = securityData?.passkeys ?? { total: 0, registered: 0, usedToday: 0, avgAuthTime: '-', platforms: {} }
  const POLICIES = securityData?.policies ?? []
  const DEVICES = securityData?.devices ?? DEFAULT_DEVICES
  const SESSIONS = securityData?.sessions ?? DEFAULT_SESSIONS
  const AUDIT_LOG = securityData?.auditLog ?? DEFAULT_AUDIT_LOG

  const filteredAudit = useMemo(() => {
    let logs = AUDIT_LOG
    if (auditSearch) {
      const q = auditSearch.toLowerCase()
      logs = logs.filter(a => a.action.toLowerCase().includes(q) || a.user.toLowerCase().includes(q) || a.details.toLowerCase().includes(q))
    }
    if (auditActionFilter !== 'all') {
      logs = logs.filter(a => a.action.startsWith(auditActionFilter))
    }
    if (auditResultFilter !== 'all') {
      logs = logs.filter(a => a.result === auditResultFilter)
    }
    return logs
  }, [auditSearch, auditActionFilter, auditResultFilter])

  // ── Loading State ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/security">Admin</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/security">Security</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Enterprise Security
        </h1>
        <p className="text-sm text-muted-foreground">SSO, passkeys, conditional access, device trust, and audit logging</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'SSO Users', value: SSO_PROVIDERS.reduce((a, p) => a + p.users, 0), icon: Key, color: 'text-green-600 dark:text-green-400' },
          { label: 'Passkeys', value: PASSKEYS.total, icon: Fingerprint, color: 'text-sky-600' },
          { label: 'Active Policies', value: POLICIES.filter(p => p.enabled).length, icon: Lock, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Active Sessions', value: SESSIONS.length, icon: Monitor, color: 'text-violet-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
                <stat.icon className="h-8 w-8 text-foreground/15" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="sso" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="sso" className="gap-1.5"><Key className="h-3.5 w-3.5 hidden sm:block" />SSO</TabsTrigger>
          <TabsTrigger value="passkeys" className="gap-1.5"><Fingerprint className="h-3.5 w-3.5 hidden sm:block" />Passkeys</TabsTrigger>
          <TabsTrigger value="policies" className="gap-1.5"><Lock className="h-3.5 w-3.5 hidden sm:block" />Policies</TabsTrigger>
          <TabsTrigger value="devices" className="gap-1.5"><Smartphone className="h-3.5 w-3.5 hidden sm:block" />Devices</TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5"><Monitor className="h-3.5 w-3.5 hidden sm:block" />Sessions</TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5"><FileText className="h-3.5 w-3.5 hidden sm:block" />Audit Log</TabsTrigger>
        </TabsList>

        {/* ── SSO Tab ─────────────────────────────────────── */}
        <TabsContent value="sso" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardDescription>Configure identity providers for single sign-on authentication</CardDescription>
            <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add Provider</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SSO_PROVIDERS.map(p => (
              <Card key={p.id} className={p.enabled ? '' : 'opacity-70'}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{p.icon}</span>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.domain || 'Not configured'}</p>
                      </div>
                    </div>
                    <Badge variant={p.enabled ? 'default' : 'secondary'}>{p.status}</Badge>
                  </div>
                  {p.enabled && (
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Users linked</span>
                        <span className="font-medium text-foreground">{p.users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last sync</span>
                        <span className="font-medium text-foreground">{p.lastSync}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setConfigureProvider(p.id)}
                    >
                      <Settings2 className="h-3.5 w-3.5 mr-1" />Configure
                    </Button>
                    <Button variant="outline" size="sm" disabled={!p.enabled}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* SSO Configure Dialog */}
          <Dialog open={!!configureProvider} onOpenChange={() => setConfigureProvider(null)}>
            <DialogContent className="sm:max-w-md forge-glass-elevated border-white/[0.06] rounded-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary" />
                  Configure {SSO_PROVIDERS.find(p => p.id === configureProvider)?.name ?? 'Provider'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input className="forge-input-glow" placeholder="Enter client ID" />
                </div>
                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <Input className="forge-input-glow" type="password" placeholder="Enter client secret" />
                </div>
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Input placeholder="Enter domain" defaultValue={SSO_PROVIDERS.find(p => p.id === configureProvider)?.domain ?? ''} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-md border">
                  <span className="text-sm">Auto-provision users</span>
                  <Switch defaultChecked />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfigureProvider(null)}>Cancel</Button>
                <Button onClick={() => setConfigureProvider(null)}>Save Configuration</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Passkeys Tab ────────────────────────────────── */}
        <TabsContent value="passkeys" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5" />Passkey Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-md border text-center">
                    <p className="text-2xl font-bold">{PASSKEYS.total}</p>
                    <p className="text-xs text-muted-foreground">Registered</p>
                  </div>
                  <div className="p-3 rounded-md border text-center">
                    <p className="text-2xl font-bold">{PASSKEYS.usedToday}</p>
                    <p className="text-xs text-muted-foreground">Used Today</p>
                  </div>
                  <div className="p-3 rounded-md border text-center">
                    <p className="text-2xl font-bold">{PASSKEYS.avgAuthTime}</p>
                    <p className="text-xs text-muted-foreground">Avg Auth Time</p>
                  </div>
                  <div className="p-3 rounded-md border text-center">
                    <p className="text-2xl font-bold">{Math.round(PASSKEYS.usedToday / PASSKEYS.total * 100)}%</p>
                    <p className="text-xs text-muted-foreground">Daily Adoption</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Platform Distribution</p>
                  <div className="space-y-2">
                    {Object.entries(PASSKEYS.platforms).map(([platform, count]) => (
                      <div key={platform} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-16 capitalize">{platform}</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${(count / PASSKEYS.total) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Register New Passkey</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>User Email</Label>
                  <Input className="forge-input-glow" placeholder="user@organization.edu" />
                </div>
                <div className="space-y-2">
                  <Label>Device Name</Label>
                  <Input className="forge-input-glow" placeholder="e.g., MacBook Pro - Personal" />
                </div>
                <div className="space-y-2">
                  <Label>Authenticator Type</Label>
                  <Select defaultValue="platform">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform">Platform (Touch ID, Face ID, Windows Hello)</SelectItem>
                      <SelectItem value="cross-platform">Cross-Platform (YubiKey, Security Key)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  <Fingerprint className="h-4 w-4 mr-2" />Start Registration
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  The user will be prompted on their device to create a passkey using their biometric or PIN
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Access Policies Tab ─────────────────────────── */}
        <TabsContent value="policies" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardDescription>Define conditional access policies that control authentication requirements based on context</CardDescription>
            <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add Policy</Button>
          </div>
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[50px]">Priority</TableHead>
                    <TableHead>Policy Name</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Control</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {POLICIES.map(p => (
                    <TableRow key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">#{p.priority}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.conditions}</TableCell>
                      <TableCell className="text-sm">{p.action}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{p.scope}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch defaultChecked={p.enabled} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View</DropdownMenuItem>
                            <DropdownMenuItem><Settings2 className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Devices Tab ─────────────────────────────────── */}
        <TabsContent value="devices" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardDescription>Manage device trust levels and compliance status for enrolled devices</CardDescription>
            <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Enroll Device</Button>
          </div>
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Device</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trust Level</TableHead>
                    <TableHead>Compliant</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEVICES.map(d => (
                    <TableRow key={d.id} className="hover:bg-white/[0.02] transition-colors">
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.user}</TableCell>
                      <TableCell className="text-sm">{d.os}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{d.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={TRUST_COLORS[d.trust] ?? ''}>{TRUST_LABELS[d.trust]}</Badge>
                      </TableCell>
                      <TableCell>
                        {d.compliant ? (
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.lastSeen}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />Details</DropdownMenuItem>
                            <DropdownMenuItem><Settings2 className="h-4 w-4 mr-2" />Manage</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Revoke</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Sessions Tab ────────────────────────────────── */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardDescription>{SESSIONS.length} active sessions across all users</CardDescription>
            <Button variant="outline" size="sm" className="text-destructive"><Trash2 className="h-4 w-4 mr-1" />Terminate All Suspicious</Button>
          </div>
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>MFA</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SESSIONS.map(s => (
                    <TableRow key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{s.user}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{s.device}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.browser}</TableCell>
                      <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{s.ip}</code></TableCell>
                      <TableCell className="text-sm">
                        <span className="flex items-center gap-1"><Globe className="h-3 w-3 text-muted-foreground" />{s.location}</span>
                      </TableCell>
                      <TableCell>
                        {s.mfaVerified ? (
                          <Badge variant="default" className="text-xs"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />None</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.duration}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.lastActive}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5 mr-1" />Terminate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Audit Log Tab ───────────────────────────────── */}
        <TabsContent value="audit" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 forge-input-glow" placeholder="Search audit log by action, user, or details..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} />
            </div>
            <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="All actions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user">User Events</SelectItem>
                <SelectItem value="policy">Policy Events</SelectItem>
                <SelectItem value="device">Device Events</SelectItem>
                <SelectItem value="mfa">MFA Events</SelectItem>
                <SelectItem value="sso">SSO Events</SelectItem>
                <SelectItem value="passkey">Passkey Events</SelectItem>
              </SelectContent>
            </Select>
            <Select value={auditResultFilter} onValueChange={setAuditResultFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All results" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Results</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-0">
              {filteredAudit.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-foreground/60" />
                  <h3 className="mt-4 text-lg font-semibold">No audit entries found</h3>
                  <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-white/[0.02] transition-colors">
                        <TableHead>Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAudit.map(a => (
                        <TableRow key={a.id} className="hover:bg-white/[0.02] transition-colors">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">{a.time}</TableCell>
                          <TableCell>
                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{a.action}</code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{a.resource}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{a.user}</TableCell>
                          <TableCell>
                            <code className="text-xs font-mono">{a.ip}</code>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={a.result === 'success' ? 'default' : a.result === 'denied' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {a.result}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={a.risk >= 70 ? 'destructive' : a.risk >= 30 ? 'secondary' : 'outline'}
                              className="text-xs"
                            >
                              {a.risk >= 70 && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {a.risk}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate">{a.details}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
