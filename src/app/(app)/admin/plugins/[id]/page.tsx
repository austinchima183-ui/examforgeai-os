'use client'

import { useState, useEffect } from 'react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Puzzle, Settings, Download, Star, Shield, CheckCircle,
  AlertTriangle, Power, Trash2, ThumbsUp, MessageSquare,
  Globe, Cpu, Lock, Eye, Clock, RefreshCw, Package,
  Code2, Zap, ExternalLink, Save
} from 'lucide-react'
import type { PluginType, PluginPermission } from '@/lib/plugins/types'
import { PLUGIN_TYPE_LABELS, PLUGIN_PERMISSION_REGISTRY } from '@/lib/plugins/types'

// ──────────────────────────────────────────────────────────────
// Plugin API Response Type
// ──────────────────────────────────────────────────────────────

interface PluginDetail {
  id: string
  name: string
  type: PluginType
  author: string
  version: string
  verified: boolean
  description: string
  longDescription: string
  rating: number
  reviewCount: number
  installs: number
  size: string
  lastUpdated: string
  license: string
  homepage: string
  permissions: PluginPermission[]
  settings: Array<{ key: string; label: string; type: string; value: unknown; options?: string[] }>
  versions: Array<{ version: string; date: string; changelog: string; compatible: boolean; breaking: boolean }>
  reviews: Array<{ id: string; user: string; rating: number; text: string; date: string; helpful: number; verified: boolean }>
  compatibility: {
    minPlatformVersion: string
    maxPlatformVersion: string
    supportedRegions: string[]
    requiredPlugins: string[]
    conflictingPlugins: string[]
  }
  installed: boolean
  enabled: boolean
}

const RISK_COLORS: Record<string, string> = {
  low: 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  medium: 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-destructive/10 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const RISK_ICONS: Record<string, typeof Shield> = {
  low: CheckCircle, medium: AlertTriangle, high: AlertTriangle, critical: Shield,
}

// ──────────────────────────────────────────────────────────────
// Helper Components
// ──────────────────────────────────────────────────────────────

function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${cls} ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-foreground/20'}`} />
      ))}
    </div>
  )
}

function RatingDistribution({ reviews }: { reviews: PluginDetail['reviews'] }) {
  const counts = [0, 0, 0, 0, 0]
  reviews.forEach(r => { counts[r.rating - 1]++ })
  const max = Math.max(...counts, 1)

  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map(star => (
        <div key={star} className="flex items-center gap-2 text-sm">
          <span className="w-3 text-right text-muted-foreground">{star}</span>
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(counts[star - 1] / max) * 100}%` }} />
          </div>
          <span className="w-6 text-right text-muted-foreground text-xs">{counts[star - 1]}</span>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────

export default function PluginDetailPage() {
  const params = useParams()
  const pluginId = params.id as string
  const [activeTab, setActiveTab] = useState('overview')
  const [pluginEnabled, setPluginEnabled] = useState(false)

  const { data: plugin, loading, error } = useApi<PluginDetail>(`/api/plugins/${pluginId}`)

  // Sync enabled state from API data
  useEffect(() => { if (plugin) setPluginEnabled(plugin.enabled) }, [plugin])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !plugin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertTriangle className="h-12 w-12 text-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold">Plugin not found</h2>
        <p className="text-muted-foreground text-sm">Failed to load plugin details</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/admin/plugins">Plugins</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/admin/plugins/${pluginId}`}>{plugin.name}</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Puzzle className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{plugin.name}</h1>
            {plugin.verified && (
              <Badge variant="default" className="gap-1 text-xs"><CheckCircle className="h-3 w-3" />Verified</Badge>
            )}
            <Badge variant="secondary">{PLUGIN_TYPE_LABELS[plugin.type]}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>by <span className="font-medium text-foreground">{plugin.author}</span></span>
            <span>·</span>
            <span>v{plugin.version}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{plugin.installs.toLocaleString()} installs</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <RatingStars rating={plugin.rating} size="md" />
            <span className="text-sm font-medium">{plugin.rating}</span>
            <span className="text-sm text-muted-foreground">({plugin.reviewCount} reviews)</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {plugin.installed ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPluginEnabled(!pluginEnabled)}
              >
                <Power className="h-4 w-4 mr-1" />{pluginEnabled ? 'Disable' : 'Enable'}
              </Button>
              <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" />Update</Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4 mr-1" />Uninstall</Button>
            </>
          ) : (
            <Button size="sm"><Download className="h-4 w-4 mr-1" />Install</Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-1.5"><Eye className="h-3.5 w-3.5 hidden sm:inline" />Overview</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-3.5 w-3.5 hidden sm:inline" />Settings</TabsTrigger>
          <TabsTrigger value="versions" className="gap-1.5"><Package className="h-3.5 w-3.5 hidden sm:inline" />Versions</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-1.5"><Star className="h-3.5 w-3.5 hidden sm:inline" />Reviews</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Description */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader><CardTitle>About</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed">{plugin.description}</p>
              <Separator />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Size</p><p className="font-medium">{plugin.size}</p></div>
                <div><p className="text-xs text-muted-foreground">License</p><p className="font-medium">{plugin.license}</p></div>
                <div><p className="text-xs text-muted-foreground">Last Updated</p><p className="font-medium">{plugin.lastUpdated}</p></div>
                <div><p className="text-xs text-muted-foreground">Homepage</p><a href={plugin.homepage} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline flex items-center gap-1">{plugin.homepage.split('/').slice(-1)[0]}<ExternalLink className="h-3 w-3" /></a></div>
              </div>
            </CardContent>
          </Card>

          {/* Permissions */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Permissions</CardTitle>
              <CardDescription>This plugin requests the following permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {plugin.permissions.map(perm => {
                const meta = PLUGIN_PERMISSION_REGISTRY[perm]
                const RiskIcon = RISK_ICONS[meta.riskLevel] || Shield
                return (
                  <div key={perm} className="flex items-center justify-between p-3 rounded-lg border hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <RiskIcon className={`h-4 w-4 shrink-0 ${meta.riskLevel === 'low' ? 'text-green-600 dark:text-green-400' : meta.riskLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : meta.riskLevel === 'high' ? 'text-orange-500' : 'text-destructive'}`} />
                      <div>
                        <p className="text-sm font-medium">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${RISK_COLORS[meta.riskLevel]}`}>{meta.riskLevel}</Badge>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Compatibility Info */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Cpu className="h-5 w-5" />Compatibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Platform Version</p>
                  <p className="text-sm font-medium">{plugin.compatibility.minPlatformVersion} — {plugin.compatibility.maxPlatformVersion}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Supported Regions</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {plugin.compatibility.supportedRegions.map(r => (
                      <Badge key={r} variant="outline" className="text-xs">{r}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              {plugin.compatibility.conflictingPlugins.length > 0 && (
                <div className="p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
                  <p className="text-xs font-medium text-orange-800 dark:text-orange-200 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Conflicting Plugins</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {plugin.compatibility.conflictingPlugins.map(p => (
                      <Badge key={p} variant="destructive" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Settings Tab ─── */}
        <TabsContent value="settings" className="space-y-4 mt-6">
          {!plugin.installed ? (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all"><CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 mx-auto text-foreground/30" />
              <h3 className="mt-4 text-lg font-semibold">Plugin not installed</h3>
              <p className="text-muted-foreground">Install this plugin to configure its settings</p>
              <Button className="mt-4"><Download className="h-4 w-4 mr-2" />Install Plugin</Button>
            </CardContent></Card>
          ) : (
            <>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
                <CardHeader>
                  <CardTitle>Plugin Settings</CardTitle>
                  <CardDescription>Configure how this plugin behaves in your organization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {plugin.settings.map((s, idx) => {
                    const settingValue = (s as { key: string; label: string; type: string; value: unknown; options?: string[] }).value
                    return (
                    <div key={s.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border hover:bg-white/[0.02] transition-colors">
                      <div className="min-w-0">
                        <Label className="cursor-pointer">{s.label}</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">Key: <code className="font-mono bg-muted px-1 rounded">{s.key}</code></p>
                      </div>
                      <div className="shrink-0">
                        {s.type === 'boolean' ? (
                          <Switch defaultChecked={settingValue as boolean} />
                        ) : s.type === 'select' ? (
                          <Select defaultValue={settingValue as string}>
                            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                            <SelectContent>{s.options?.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : s.type === 'number' ? (
                          <Input type="number" defaultValue={settingValue as number} className="w-[120px] forge-input-glow" />
                        ) : (
                          <Input defaultValue={String(settingValue)} className="w-[200px] forge-input-glow" />
                        )}
                      </div>
                    </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Advanced</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Custom API Endpoint</Label>
                    <Input placeholder="https://api.example.com/v1" />
                    <p className="text-xs text-muted-foreground">Override the default API endpoint for this plugin</p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input placeholder="https://your-server.com/webhook" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div><Label>Debug Mode</Label><p className="text-xs text-muted-foreground">Enable verbose logging for troubleshooting</p></div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2 justify-end">
                <Button variant="outline">Reset to Defaults</Button>
                <Button><Save className="h-4 w-4 mr-1" />Save Settings</Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Versions Tab ─── */}
        <TabsContent value="versions" className="mt-6">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Version History</CardTitle>
              <CardDescription>{plugin.versions.length} versions released</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plugin.versions.map((v, i) => (
                <div key={v.version} className={`p-4 rounded-lg border ${i === 0 ? 'border-primary/30 bg-primary/5' : 'hover:bg-muted/50'} transition-colors`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">v{v.version}</p>
                        {i === 0 && <Badge variant="default" className="text-xs">Current</Badge>}
                        {v.compatible ? (
                          <Badge variant="default" className="text-xs gap-0.5"><CheckCircle className="h-3 w-3" />Compatible</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs gap-0.5"><AlertTriangle className="h-3 w-3" />Incompatible</Badge>
                        )}
                        {v.breaking && <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-300">Breaking</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{v.changelog}</p>
                    </div>
                    <div className="text-sm text-muted-foreground shrink-0 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />{v.date}
                    </div>
                  </div>
                  {i !== 0 && v.compatible && (
                    <Button variant="outline" size="sm" className="mt-3 text-xs">
                      <Download className="h-3 w-3 mr-1" />Downgrade to v{v.version}
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Reviews Tab ─── */}
        <TabsContent value="reviews" className="space-y-6 mt-6">
          {/* Rating Summary */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardContent className="py-6">
              <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-6 items-center">
                <div className="text-center">
                  <p className="text-4xl font-bold">{plugin.rating}</p>
                  <RatingStars rating={plugin.rating} size="md" />
                  <p className="text-xs text-muted-foreground mt-1">{plugin.reviewCount} reviews</p>
                </div>
                <RatingDistribution reviews={plugin.reviews} />
              </div>
            </CardContent>
          </Card>

          {/* Review List */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Reviews</CardTitle>
                <Button variant="outline" size="sm"><MessageSquare className="h-4 w-4 mr-1" />Write Review</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {plugin.reviews.length === 0 ? (
                <div className="py-8 text-center">
                  <Star className="h-12 w-12 mx-auto text-foreground/30" />
                  <h3 className="mt-4 text-lg font-semibold">No reviews yet</h3>
                  <p className="text-muted-foreground">Be the first to review this plugin</p>
                </div>
              ) : (
                plugin.reviews.map(r => (
                  <div key={r.id} className="p-4 rounded-lg border space-y-2 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{r.user.split(' ').map(w => w[0]).join('')}</AvatarFallback></Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{r.user}</p>
                            {r.verified && <Badge variant="secondary" className="text-[10px] px-1 gap-0.5"><CheckCircle className="h-2.5 w-2.5" />Verified</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">{r.date}</p>
                        </div>
                      </div>
                      <RatingStars rating={r.rating} size="sm" />
                    </div>
                    <p className="text-sm leading-relaxed">{r.text}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                        <ThumbsUp className="h-3 w-3" />Helpful ({r.helpful})
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


