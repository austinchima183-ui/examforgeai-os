'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Building2, Users, Settings, Palette, Shield,
  ChevronRight, Plus, Key, Lock, Upload, AlertCircle,
  TreePine, CreditCard, Globe, Calendar, Mail,
  ChevronDown, Check, ToggleLeft, Server, Cpu,
  GraduationCap, ShieldCheck, Fingerprint, Smartphone,
  Cloud, Monitor, AlertTriangle, ExternalLink, Copy
} from 'lucide-react'
import type { OrganizationType } from '@/lib/enterprise/types'

const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  school: 'School', school_group: 'School Group', district: 'District', ministry: 'Ministry',
  region: 'Region', country: 'Country', campus: 'Campus', branch: 'Branch',
  department: 'Department', faculty: 'Faculty', university: 'University', college: 'College',
  examination_council: 'Exam Council', ngo: 'NGO', corporate_training: 'Corporate Training',
  international_network: 'International Network',
}

const ORG_TYPE_COLORS: Record<string, string> = {
  school: 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  district: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  ministry: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  campus: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  region: 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  country: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  university: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  college: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  department: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  faculty: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  school_group: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  branch: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200',
  examination_council: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  ngo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  corporate_training: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
  international_network: 'bg-destructive/10 text-red-800 dark:bg-red-900 dark:text-red-200',
}

// ── Org Detail API Response Type ────────────────────────────
interface OrgDetail {
  id: string
  name: string
  type: OrganizationType
  code: string
  isActive: boolean
  primaryColor: string
  memberCount: number
  childCount: number
  subscriptionCount: number
  path: string[]
  createdAt: string
  country: string
  countryFlag: string
  timezone: string
  children: Array<{ id: string; name: string; type: OrganizationType; memberCount: number; isActive: boolean; code: string }>
  members: Array<{ id: string; name: string; role: string; email: string; delegatedFrom: string | null; avatar: string; status: 'active' | 'inactive'; lastActive: string }>
  featureFlags: Array<{ key: string; label: string; enabled: boolean; category: string }>
  ssoProviders: Array<{ type: string; name: string; enabled: boolean; status: 'active' | 'inactive'; lastSync: string | null; domain: string | null }>
}

export default function OrganizationDetailPage() {
  const params = useParams()
  const orgId = params.id as string
  const [activeTab, setActiveTab] = useState('overview')
  const [addMemberOpen, setAddMemberOpen] = useState(false)

  const { data: org, loading, error } = useApi<OrgDetail>(`/api/organizations/${orgId}`)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Server className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !org) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="h-12 w-12 text-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold">Organization not found</h2>
        <p className="text-muted-foreground text-sm">Failed to load organization details</p>
      </div>
    )
  }

  const featureCategories = Array.from(new Set(org.featureFlags.map(f => f.category)))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/organizations">Organizations</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/admin/organizations/${orgId}`}>{org.name}</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Organization Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Avatar className="h-16 w-16 rounded-lg border-2 shrink-0" style={{ borderColor: org.primaryColor }}>
          <AvatarFallback className="rounded-lg text-xl font-bold" style={{ backgroundColor: `${org.primaryColor}20`, color: org.primaryColor }}>
            {org.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
            <Badge className={ORG_TYPE_COLORS[org.type] || 'bg-secondary text-secondary-foreground'}>{ORG_TYPE_LABELS[org.type]}</Badge>
            <Badge variant={org.isActive ? 'default' : 'destructive'} className="gap-1">
              {org.isActive ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              {org.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{org.code}</span>
            <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{org.countryFlag} {org.country}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Created {org.createdAt}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-1" />Manage</Button>
          <Button variant="outline" size="sm"><ExternalLink className="h-4 w-4 mr-1" />Visit</Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-1.5"><Building2 className="h-3.5 w-3.5 hidden sm:inline" />Overview</TabsTrigger>
          <TabsTrigger value="children" className="gap-1.5"><TreePine className="h-3.5 w-3.5 hidden sm:inline" />Children</TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5"><Users className="h-3.5 w-3.5 hidden sm:inline" />Members</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-3.5 w-3.5 hidden sm:inline" />Settings</TabsTrigger>
          <TabsTrigger value="branding" className="gap-1.5"><Palette className="h-3.5 w-3.5 hidden sm:inline" />Branding</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5 hidden sm:inline" />Security</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Org Path Breadcrumb */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><ChevronRight className="h-4 w-4" />Organization Path</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1 text-sm items-center">
                {org.path.map((p, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    <span className={`px-2 py-1 rounded-md ${i === org.path.length - 1 ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted cursor-pointer'}`}>
                      {p}
                    </span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Members</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{org.memberCount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Across all child organizations</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><TreePine className="h-4 w-4 text-green-600 dark:text-green-400" />Child Organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{org.childCount}</p>
                <p className="text-xs text-muted-foreground mt-1">{org.children.filter(c => c.isActive).length} active</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-md transition-shadow forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />Subscriptions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{org.subscriptionCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Active plans</p>
              </CardContent>
            </Card>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Organization Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Code</span><span className="font-mono">{org.code}</span></div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Type</span><Badge variant="secondary" className="text-xs">{ORG_TYPE_LABELS[org.type]}</Badge></div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Country</span><span>{org.countryFlag} {org.country}</span></div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Timezone</span><span>{org.timezone}</span></div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Created</span><span>{org.createdAt}</span></div>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Quick Stats</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Active Members</span><span className="font-medium">{org.members.filter(m => m.status === 'active').length}</span></div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Active Children</span><span className="font-medium">{org.children.filter(c => c.isActive).length}</span></div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Enabled Features</span><span className="font-medium">{org.featureFlags.filter(f => f.enabled).length}/{org.featureFlags.length}</span></div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">SSO Providers</span><span className="font-medium">{org.ssoProviders.filter(p => p.enabled).length}/{org.ssoProviders.length}</span></div>
                <Separator />
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge variant={org.isActive ? 'default' : 'destructive'} className="text-xs">{org.isActive ? 'Active' : 'Inactive'}</Badge></div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Children Tab ─── */}
        <TabsContent value="children" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Child Organizations</h2>
              <p className="text-sm text-muted-foreground">{org.children.length} organizations under this {ORG_TYPE_LABELS[org.type].toLowerCase()}</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Child</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Child Organization</DialogTitle>
                  <DialogDescription>Create a new organization under {org.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label>Name</Label><Input placeholder="e.g., Victoria Island Campus" /></div>
                  <div className="space-y-2"><Label>Type</Label>
                    <Select defaultValue="campus"><SelectTrigger /><SelectContent>
                      <SelectItem value="campus">Campus</SelectItem><SelectItem value="school">School</SelectItem><SelectItem value="branch">Branch</SelectItem><SelectItem value="department">Department</SelectItem>
                    </SelectContent></Select>
                  </div>
                  <div className="space-y-2"><Label>Code</Label><Input placeholder="e.g., LAG-D01-VI" /></div>
                </div>
                <DialogFooter><Button>Create Organization</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {org.children.length === 0 ? (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all"><CardContent className="py-12 text-center">
              <TreePine className="h-12 w-12 mx-auto text-foreground/30" />
              <h3 className="mt-4 text-lg font-semibold">No child organizations</h3>
              <p className="text-muted-foreground">Add child organizations to build your hierarchy</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {org.children.map(child => (
                <Card key={child.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 rounded-lg">
                          <AvatarFallback className="rounded-lg text-xs font-bold bg-primary/10 text-primary">
                            {child.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium group-hover:text-primary transition-colors">{child.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{child.code}</p>
                        </div>
                      </div>
                      <Badge variant={child.isActive ? 'default' : 'destructive'} className="text-xs">{child.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">{ORG_TYPE_LABELS[child.type]}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{child.memberCount} members</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Members Tab ─── */}
        <TabsContent value="members" className="space-y-4 mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Members</h2>
              <p className="text-sm text-muted-foreground">{org.members.length} members with access to this organization</p>
            </div>
            <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                  <DialogDescription>Grant a user access to {org.name}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2"><Label>Email</Label><Input placeholder="user@example.edu" /></div>
                  <div className="space-y-2"><Label>Role</Label>
                    <Select defaultValue="viewer"><SelectTrigger /><SelectContent>
                      <SelectItem value="district_admin">District Admin</SelectItem><SelectItem value="academic_director">Academic Director</SelectItem><SelectItem value="finance_manager">Finance Manager</SelectItem><SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent></Select>
                  </div>
                </div>
                <DialogFooter><Button>Add Member</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {org.members.length === 0 ? (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all"><CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-foreground/30" />
              <h3 className="mt-4 text-lg font-semibold">No members</h3>
              <p className="text-muted-foreground">Add members to manage this organization</p>
            </CardContent></Card>
          ) : (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardContent className="p-0">
                <ScrollArea className="max-h-96">
                  <div className="divide-y">
                    {org.members.map(m => (
                      <div key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-xs">{m.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{m.name}</p>
                              {m.status === 'inactive' && <Badge variant="destructive" className="text-[10px] px-1">Inactive</Badge>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />{m.email}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">{m.role}</Badge>
                            {m.delegatedFrom && (
                              <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                                <ChevronRight className="h-2.5 w-2.5" />Delegated from {m.delegatedFrom}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{m.lastActive}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Settings Tab ─── */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* Feature Flags by Category */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ToggleLeft className="h-5 w-5" />Feature Flags</CardTitle>
              <CardDescription>Enable or disable platform features for this organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {featureCategories.map(category => (
                <div key={category}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</p>
                  <div className="space-y-3">
                    {org.featureFlags.filter(f => f.category === category).map(f => (
                      <div key={f.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-white/[0.02] transition-colors">
                        <div>
                          <Label className="cursor-pointer">{f.label}</Label>
                          <p className="text-xs text-muted-foreground mt-0.5">Key: {f.key}</p>
                        </div>
                        <Switch defaultChecked={f.enabled} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Model Configuration */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" />AI Model Configuration</CardTitle>
              <CardDescription>Configure AI models and resource limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default AI Model</Label>
                  <Select defaultValue="gpt-4o"><SelectTrigger /><SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                    <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  </SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select defaultValue="openai"><SelectTrigger /><SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="google">Google AI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="azure">Azure OpenAI</SelectItem>
                  </SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label>Monthly Token Budget</Label>
                  <Input type="number" defaultValue="1000000" />
                  <p className="text-xs text-muted-foreground">Approx. $30/month at current rates</p>
                </div>
                <div className="space-y-2">
                  <Label>Requests Per Minute</Label>
                  <Input type="number" defaultValue="60" />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Custom System Prompt</Label>
                <Textarea placeholder="Override the default AI system prompt for this organization..." className="min-h-[80px]" />
                <p className="text-xs text-muted-foreground">Leave empty to use the default system prompt</p>
              </div>
            </CardContent>
          </Card>

          {/* Academic Year Settings */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" />Academic Year Configuration</CardTitle>
              <CardDescription>Define the academic calendar structure</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Year Format</Label>
                  <Input defaultValue="YYYY-YYYY" />
                </div>
                <div className="space-y-2">
                  <Label>Start Month</Label>
                  <Select defaultValue="9"><SelectTrigger /><SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <SelectItem key={m} value={String(m)}>{new Date(2024, m - 1).toLocaleString('en', { month: 'long' })}</SelectItem>
                    ))}
                  </SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label>Terms Per Year</Label>
                  <Select defaultValue="3"><SelectTrigger /><SelectContent>
                    <SelectItem value="2">2 Terms (Semester)</SelectItem>
                    <SelectItem value="3">3 Terms</SelectItem>
                    <SelectItem value="4">4 Terms (Quarter)</SelectItem>
                  </SelectContent></Select>
                </div>
                <div className="space-y-2">
                  <Label>Grading Scale</Label>
                  <Select defaultValue="percentage"><SelectTrigger /><SelectContent>
                    <SelectItem value="percentage">Percentage (0-100)</SelectItem>
                    <SelectItem value="gpa_4">GPA (4.0)</SelectItem>
                    <SelectItem value="gpa_5">GPA (5.0)</SelectItem>
                    <SelectItem value="letter">Letter (A-F)</SelectItem>
                  </SelectContent></Select>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div><Label>Term-Based Grading</Label><p className="text-xs text-muted-foreground">Calculate grades per term before yearly average</p></div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div><Label>Auto-Promote Students</Label><p className="text-xs text-muted-foreground">Automatically promote at end of academic year</p></div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Branding Tab ─── */}
        <TabsContent value="branding" className="space-y-6 mt-6">
          {/* Brand Colors */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Brand Colors</CardTitle>
              <CardDescription>Customize the visual identity for this organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" defaultValue="#2563eb" className="w-12 h-10 p-1 cursor-pointer rounded-md forge-input-glow" />
                    <Input defaultValue="#2563eb" className="flex-1 font-mono forge-input-glow" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" defaultValue="#16a34a" className="w-12 h-10 p-1 cursor-pointer rounded-md forge-input-glow" />
                    <Input defaultValue="#16a34a" className="flex-1 font-mono forge-input-glow" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <Input type="color" defaultValue="#f59e0b" className="w-12 h-10 p-1 cursor-pointer rounded-md forge-input-glow" />
                    <Input defaultValue="#f59e0b" className="flex-1 font-mono forge-input-glow" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Logo & Favicon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted hover:bg-muted/80 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" />Upload Logo</Button>
                  <p className="text-xs text-muted-foreground">PNG, SVG, or WebP. Max 2MB. 512x512 recommended.</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input placeholder="https://cdn.example.com/logo.svg" />
                <p className="text-xs text-muted-foreground">Use a CDN URL for fastest loading</p>
              </div>
            </CardContent>
          </Card>

          {/* Custom Domain */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Custom Domain</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input placeholder="exams.myschool.edu" />
              </div>
              <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-950 border border-yellow-300 dark:border-yellow-700">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">Add a CNAME record pointing to <code className="font-mono bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-900 px-1 rounded">cname.examforge.ai</code> to verify ownership</p>
              </div>
              <div className="flex items-center justify-between">
                <div><Label>SSL Certificate</Label><p className="text-xs text-muted-foreground">Automatically provisioned via Let&apos;s Encrypt</p></div>
                <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Active</Badge>
              </div>
            </CardContent>
          </Card>

          {/* White-Label */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5" />White-Label</CardTitle>
              <CardDescription>Remove ExamForge branding for a fully custom experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div><Label className="cursor-pointer">Enable White-Labeling</Label><p className="text-xs text-muted-foreground">Requires Enterprise plan</p></div>
                <Switch />
              </div>
              <Separator />
              <div className="space-y-2"><Label>Custom App Name</Label><Input placeholder="ExamForge AI" /></div>
              <div className="space-y-2"><Label>Support Email</Label><Input placeholder="support@myschool.edu" /></div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <Label className="cursor-pointer">Hide &quot;Powered by ExamForge&quot;</Label><Switch />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <Label className="cursor-pointer">Show Marketplace</Label><Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <Label className="cursor-pointer">Show AI Features</Label><Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Security Tab ─── */}
        <TabsContent value="security" className="space-y-6 mt-6">
          {/* SSO Providers */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5" />SSO Providers</CardTitle>
              <CardDescription>Configure single sign-on for your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {org.ssoProviders.map(p => (
                  <Card key={p.type} className={`border-dashed ${p.enabled ? 'border-primary/30' : ''}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {p.type === 'google' && <Cloud className="h-4 w-4 text-muted-foreground" />}
                          {p.type === 'azure_ad' && <Cloud className="h-4 w-4 text-muted-foreground" />}
                          {p.type === 'okta' && <ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                          {p.type === 'ldap' && <Server className="h-4 w-4 text-muted-foreground" />}
                          <p className="font-medium">{p.name}</p>
                        </div>
                        <Badge variant={p.enabled ? 'default' : 'secondary'} className="text-xs">{p.status}</Badge>
                      </div>
                      {p.domain && <p className="text-xs text-muted-foreground">Domain: {p.domain}</p>}
                      {p.lastSync && <p className="text-xs text-muted-foreground">Last sync: {p.lastSync}</p>}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">Configure</Button>
                        <Button variant="outline" size="sm">Test</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conditional Access Policies */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Conditional Access Policies</CardTitle>
              <CardDescription>Control access based on user context and risk</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="font-medium text-sm">Require MFA for Admin Access</p>
                  <p className="text-xs text-muted-foreground">Enforce for roles: super_admin, school_admin, district_admin</p>
                </div>
                <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="font-medium text-sm">Block Suspicious IPs</p>
                  <p className="text-xs text-muted-foreground">Risk level &gt; high from threat intelligence feeds</p>
                </div>
                <Badge variant="default" className="gap-1"><Check className="h-3 w-3" />Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-white/[0.02] transition-colors">
                <div>
                  <p className="font-medium text-sm">Restrict Student Access to School Hours</p>
                  <p className="text-xs text-muted-foreground">Mon-Fri 7:00-17:00, student role only</p>
                </div>
                <Badge variant="secondary">Draft</Badge>
              </div>
              <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Add Policy</Button>
            </CardContent>
          </Card>

          {/* MFA Configuration */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5" />MFA Configuration</CardTitle>
              <CardDescription>Multi-factor authentication settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div><Label className="cursor-pointer">Require MFA for all users</Label><p className="text-xs text-muted-foreground">Users must set up MFA within the grace period</p></div>
                <Switch />
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Allowed MFA Methods</Label>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-md border">
                      <span className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" />TOTP App</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md border">
                      <span className="text-sm flex items-center gap-2"><Smartphone className="h-4 w-4" />SMS</span>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-md border">
                      <span className="text-sm flex items-center gap-2"><Fingerprint className="h-4 w-4" />Passkey / WebAuthn</span>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Grace Period (days)</Label>
                  <Input type="number" defaultValue={7} className="w-24 forge-input-glow" />
                  <p className="text-xs text-muted-foreground">Days before MFA enforcement after first login</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
