'use client'

import { useState, useCallback } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Key, Code, BookOpen, Download, Terminal, Activity,
  Copy, ExternalLink, Plus, Trash2, Shield, CheckCircle2,
  Zap, RefreshCw, Globe, ChevronRight
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────
interface ApiKey {
  id: string
  name: string
  prefix: string
  scopes: string[]
  created: string
  lastUsed: string
  expiresAt: string | null
}

interface OAuthApp {
  id: string
  name: string
  clientId: string
  redirectUris: string[]
  created: string
  scopes: string[]
}

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  path: string
  description: string
  category: string
}

interface SdkInfo {
  name: string
  language: string
  icon: string
  installCommand: string
  version: string
  description: string
}

// ── API Data types ──────────────────────────────────────────────
interface DeveloperData {
  keys: ApiKey[]
  oauthApps: OAuthApp[]
}

const API_ENDPOINTS: ApiEndpoint[] = [
  { method: 'GET', path: '/api/exams', description: 'List all exams with filtering and pagination', category: 'Exams' },
  { method: 'POST', path: '/api/exams', description: 'Create a new exam with questions and settings', category: 'Exams' },
  { method: 'GET', path: '/api/exams/:id', description: 'Get a specific exam by ID with full details', category: 'Exams' },
  { method: 'PATCH', path: '/api/exams/:id', description: 'Update exam properties and configuration', category: 'Exams' },
  { method: 'DELETE', path: '/api/exams/:id', description: 'Delete an exam and associated data', category: 'Exams' },
  { method: 'GET', path: '/api/questions', description: 'List questions from the question bank', category: 'Questions' },
  { method: 'POST', path: '/api/questions', description: 'Create a new question with AI assistance', category: 'Questions' },
  { method: 'GET', path: '/api/students', description: 'List students with enrollment details', category: 'Students' },
  { method: 'GET', path: '/api/analytics', description: 'Get analytics data for dashboards', category: 'Analytics' },
  { method: 'POST', path: '/api/ai/complete', description: 'AI completion endpoint for content generation', category: 'AI' },
  { method: 'POST', path: '/api/ai/stream', description: 'AI streaming endpoint for real-time generation', category: 'AI' },
  { method: 'GET', path: '/api/schools', description: 'List schools in the organization', category: 'Schools' },
  { method: 'PATCH', path: '/api/billing/subscriptions', description: 'Update subscription plan and seats', category: 'Billing' },
  { method: 'DELETE', path: '/api/billing/refund', description: 'Process a refund for a transaction', category: 'Billing' },
]

const SDK_DOWNLOADS: SdkInfo[] = [
  { name: 'JavaScript / TypeScript', language: 'TypeScript', icon: 'TS', installCommand: 'npm install @examforge/sdk', version: '2.4.1', description: 'Full-featured SDK with TypeScript types, works in Node.js and modern browsers' },
  { name: 'Python', language: 'Python', icon: 'PY', installCommand: 'pip install examforge-sdk', version: '1.8.0', description: 'Python SDK with async support, works with Python 3.8+ and Jupyter notebooks' },
  { name: 'Dart / Flutter', language: 'Dart', icon: 'DT', installCommand: 'dart pub add examforge_sdk', version: '1.2.0', description: 'Dart SDK for Flutter mobile apps with full platform support' },
]

const USAGE_STATS = {
  totalRequests: 1_425_678,
  errorRate: 0.42,
  avgLatency: 52,
  p95Latency: 180,
  uptime: 99.97,
}

// ── Method badge colors ──────────────────────────────────────────
const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900/40 dark:text-green-400',
  POST: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  PATCH: 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900/40 dark:text-yellow-400',
  PUT: 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900/40 dark:text-yellow-400',
  DELETE: 'bg-destructive/10 text-red-800 dark:bg-destructive/10 dark:text-destructive',
}

// ── Available Scopes ─────────────────────────────────────────────
const AVAILABLE_SCOPES = [
  'exams:read', 'exams:write', 'questions:read', 'questions:write',
  'students:read', 'students:write', 'results:read', 'results:write',
  'analytics:read', 'schools:read', 'schools:write',
  'billing:read', 'billing:write', 'profile:read',
]

// ── Main Component ───────────────────────────────────────────────
export default function DeveloperPortalPage() {
  const [activeTab, setActiveTab] = useState('keys')
  const [createKeyOpen, setCreateKeyOpen] = useState(false)
  const [createOAuthOpen, setCreateOAuthOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['exams:read'])
  const [newAppName, setNewAppName] = useState('')
  const [newAppUri, setNewAppUri] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data: devData, loading, error } = useApi<DeveloperData>('/api/developer/keys')
  const apiKeys = devData?.keys ?? []
  const oauthApps = devData?.oauthApps ?? []

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  const toggleScope = (scope: string) => {
    setNewKeyScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope])
  }

  const endpointCategories = [...new Set(API_ENDPOINTS.map(e => e.category))]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/developers">Developer Portal</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Developer Portal</h1>
        <p className="text-sm text-muted-foreground">Manage API keys, OAuth apps, explore endpoints & download SDKs</p>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Activity className="h-4 w-4" />Total Requests</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <p className="text-2xl font-bold">{USAGE_STATS.totalRequests.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Zap className="h-4 w-4" />Error Rate</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <p className="text-2xl font-bold">{USAGE_STATS.errorRate}%</p>
                <p className="text-xs text-green-600 dark:text-green-400">Below 1% threshold</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Terminal className="h-4 w-4" />Avg Latency</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <p className="text-2xl font-bold">{USAGE_STATS.avgLatency}ms</p>
                <p className="text-xs text-muted-foreground">p95: {USAGE_STATS.p95Latency}ms</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Shield className="h-4 w-4" />Uptime</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8-20" /> : (
              <>
                <p className="text-2xl font-bold">{USAGE_STATS.uptime}%</p>
                <p className="text-xs text-green-600 dark:text-green-400">All systems operational</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Key className="h-4 w-4" />API Keys</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <>
                <p className="text-2xl font-bold">{apiKeys.length}</p>
                <p className="text-xs text-muted-foreground">{oauthApps.length} OAuth apps</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="keys" className="gap-2"><Key className="h-4 w-4" />API Keys</TabsTrigger>
          <TabsTrigger value="oauth" className="gap-2"><Shield className="h-4 w-4" />OAuth Apps</TabsTrigger>
          <TabsTrigger value="docs" className="gap-2"><BookOpen className="h-4 w-4" />API Docs</TabsTrigger>
          <TabsTrigger value="sdk" className="gap-2"><Download className="h-4 w-4" />SDK Downloads</TabsTrigger>
        </TabsList>

        {/* ── API Keys Tab ─────────────────────────────────────── */}
        <TabsContent value="keys" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />API Keys</CardTitle>
                <CardDescription>Authenticate API requests with scoped keys</CardDescription>
              </div>
              <Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />Create Key</Button>
                </DialogTrigger>
                <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl sm:max-w-[500px]">
                  <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input placeholder="e.g., Production API Key" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Scopes</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                        {AVAILABLE_SCOPES.map(scope => (
                          <label key={scope} className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={newKeyScopes.includes(scope)}
                              onCheckedChange={() => toggleScope(scope)}
                            />
                            <span className="font-mono text-xs">{scope}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setCreateKeyOpen(false); setNewKeyName(''); setNewKeyScopes(['exams:read']) }}>Cancel</Button>
                    <Button onClick={() => { setCreateKeyOpen(false); setNewKeyName(''); setNewKeyScopes(['exams:read']) }} disabled={!newKeyName.trim() || newKeyScopes.length === 0}>
                      Create Key
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : apiKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Key className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No API keys created yet</p>
                  <Button variant="outline" size="sm" className="mt-3">Create your first key</Button>
                </div>
              ) : (
                <ScrollArea className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
                      <TableRow className="hover:bg-white/[0.02] transition-colors">
                        <TableHead>Name</TableHead>
                        <TableHead>Prefix</TableHead>
                        <TableHead>Scopes</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map(key => (
                        <TableRow key={key.id}>
                          <TableCell className="font-medium">{key.name}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{key.prefix}</code>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap max-w-[200px]">
                              {key.scopes.slice(0, 2).map(s => <Badge key={s} variant="outline" className="text-xs font-mono">{s}</Badge>)}
                              {key.scopes.length > 2 && <Badge variant="outline" className="text-xs">+{key.scopes.length - 2}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{key.created}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{key.lastUsed}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{key.expiresAt ?? 'Never'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(key.prefix, key.id)}>
                                {copiedId === key.id ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── OAuth Apps Tab ───────────────────────────────────── */}
        <TabsContent value="oauth" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />OAuth Applications</CardTitle>
                <CardDescription>Register applications for OAuth 2.0 authentication</CardDescription>
              </div>
              <Dialog open={createOAuthOpen} onOpenChange={setCreateOAuthOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" />Register App</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Register OAuth Application</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Application Name</Label>
                      <Input placeholder="e.g., Student Portal" value={newAppName} onChange={e => setNewAppName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Redirect URIs</Label>
                      <Input placeholder="https://yourapp.com/callback" value={newAppUri} onChange={e => setNewAppUri(e.target.value)} />
                      <p className="text-xs text-muted-foreground">Separate multiple URIs with commas</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setCreateOAuthOpen(false); setNewAppName(''); setNewAppUri('') }}>Cancel</Button>
                    <Button onClick={() => { setCreateOAuthOpen(false); setNewAppName(''); setNewAppUri('') }} disabled={!newAppName.trim()}>Register</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : oauthApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No OAuth apps registered</p>
                  <Button variant="outline" size="sm" className="mt-3">Register your first app</Button>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  {oauthApps.map(app => (
                    <div key={app.id} className="flex items-start justify-between p-4 rounded-lg border hover:bg-white/[0.02] transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{app.name}</p>
                            <p className="text-xs text-muted-foreground">Created {app.created}</p>
                          </div>
                        </div>
                        <div className="ml-12 space-y-1">
                          <p className="text-sm"><span className="text-muted-foreground">Client ID:</span> <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{app.clientId}</code></p>
                          <p className="text-sm"><span className="text-muted-foreground">Redirect:</span> <code className="text-xs font-mono">{app.redirectUris[0]}</code></p>
                          <div className="flex gap-1 flex-wrap pt-1">
                            {app.scopes.map(s => <Badge key={s} variant="outline" className="text-xs font-mono">{s}</Badge>)}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(app.clientId, app.id)}>
                          {copiedId === app.id ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── API Docs Tab ─────────────────────────────────────── */}
        <TabsContent value="docs" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Category Sidebar */}
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {endpointCategories.map(cat => (
                    <button key={cat} className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors flex items-center justify-between group">
                      <span>{cat}</span>
                      <span className="text-xs text-muted-foreground">{API_ENDPOINTS.filter(e => e.category === cat).length}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Endpoint Cards */}
            <div className="lg:col-span-3 space-y-3">
              {endpointCategories.map(category => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{category}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {API_ENDPOINTS.filter(e => e.category === category).map((ep, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-md border hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge className={`${METHOD_COLORS[ep.method]} font-mono text-xs min-w-[52px] justify-center`}>
                            {ep.method}
                          </Badge>
                          <code className="text-sm font-mono truncate">{ep.path}</code>
                          <span className="text-sm text-muted-foreground hidden md:inline truncate">{ep.description}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs">
                          <Terminal className="h-3 w-3" />Try It
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── SDK Downloads Tab ────────────────────────────────── */}
        <TabsContent value="sdk" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SDK_DOWNLOADS.map(sdk => (
              <Card key={sdk.name} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <span className="font-bold text-sm">{sdk.icon}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{sdk.name}</CardTitle>
                      <CardDescription>v{sdk.version}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{sdk.description}</p>

                  <div className="rounded-md bg-muted/80 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground font-medium">Install</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(sdk.installCommand, sdk.language)}>
                        {copiedId === sdk.language ? <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <code className="text-sm font-mono">{sdk.installCommand}</code>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <BookOpen className="h-3.5 w-3.5" />Docs
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-2">
                      <ExternalLink className="h-3.5 w-3.5" />GitHub
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Start */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Terminal className="h-5 w-5" />Quick Start</CardTitle>
              <CardDescription>Get up and running in under 5 minutes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted/80 p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">1. Install the SDK</p>
                <code className="text-sm font-mono block">npm install @examforge/sdk</code>
              </div>
              <div className="rounded-md bg-muted/80 p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">2. Initialize the client</p>
                <code className="text-sm font-mono block">{'const client = new ExamForge({ apiKey: "ef_live_..." });'}</code>
              </div>
              <div className="rounded-md bg-muted/80 p-4 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">3. Make your first request</p>
                <code className="text-sm font-mono block">{'const exams = await client.exams.list();'}</code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
