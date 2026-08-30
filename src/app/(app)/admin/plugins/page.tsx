'use client'

import { useState, useMemo } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search, Star, Download, CheckCircle, Puzzle, Plus,
  ChevronLeft, ChevronRight, Store, Shield, Settings2,
  ExternalLink, MoreHorizontal
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { PluginType } from '@/lib/plugins/types'
import { PLUGIN_TYPE_LABELS } from '@/lib/plugins/types'

// ── Constants ────────────────────────────────────────────────

const PLUGIN_TYPES: PluginType[] = [
  'app', 'theme', 'widget', 'ai_skill', 'integration', 'report',
  'analytics', 'certificate', 'question_type', 'payment_provider', 'identity_provider', 'communication_provider',
]

// ── Plugin type for API response ────────────────────────────
interface PluginItem {
  id: string
  name: string
  type: PluginType
  author: string
  version: string
  rating: number
  installs: number
  verified: boolean
  featured: boolean
  icon: string
  installed: boolean
  category: string
  description: string
}

// ── Rating Stars Component ───────────────────────────────────

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3 w-3 ${i <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-foreground/20'}`} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating}</span>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────

export default function PluginMarketplacePage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<PluginType | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('marketplace')
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [configureOpen, setConfigureOpen] = useState(false)
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null)

  const { data: plugins, loading: isLoading, error } = useApi<PluginItem[] | { listings: PluginItem[]; total: number }>('/api/plugins')
  // API returns a search envelope ({ listings, total, ... }) — normalize to an array
  const pluginList = Array.isArray(plugins) ? plugins : plugins?.listings ?? []

  const CATEGORIES = useMemo(() => {
    const cats = [...new Set(pluginList.map(p => p.category))]
    return [
      { id: 'all', name: 'All', count: pluginList.length },
      ...cats.map(c => ({ id: c, name: c, count: pluginList.filter(p => p.category === c).length })),
    ]
  }, [pluginList])

  const featured = pluginList.filter(p => p.featured)

  const filtered = useMemo(() => {
    let list = activeTab === 'installed' ? pluginList.filter(p => p.installed) : pluginList
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.author.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
    }
    if (typeFilter !== 'all') list = list.filter(p => p.type === typeFilter)
    if (categoryFilter !== 'all') list = list.filter(p => p.category === categoryFilter)
    return list
  }, [search, typeFilter, categoryFilter, activeTab, pluginList])

  // ── Loading State ─────────────────────────────────────────
  if (isLoading || error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-52" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/plugins">Admin</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/plugins">Plugins</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Puzzle className="h-6 w-6 text-primary" />
            Plugin Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">Extend ExamForge AI with plugins, integrations, and AI skills</p>
        </div>
        <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Submit Plugin</Button>
      </div>

      {/* Featured Plugins Carousel */}
      {activeTab === 'marketplace' && featured.length > 0 && (
        <Card className="overflow-hidden border-primary/20 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-0 relative">
            <div className="flex items-center p-6 gap-6">
              <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => setFeaturedIndex(i => (i - 1 + featured.length) % featured.length)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1 flex items-center gap-6">
                <div className="h-20 w-20 rounded-xl bg-primary/10 flex items-center justify-center text-4xl shrink-0">
                  {featured[featuredIndex].icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{featured[featuredIndex].name}</h2>
                    {featured[featuredIndex].verified && <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />}
                    <Badge variant="secondary">{PLUGIN_TYPE_LABELS[featured[featuredIndex].type]}</Badge>
                    <Badge variant="outline" className="text-xs">v{featured[featuredIndex].version}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">{featured[featuredIndex].description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <RatingStars rating={featured[featuredIndex].rating} />
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" />{featured[featuredIndex].installs.toLocaleString()} installs
                    </span>
                    <span className="text-sm text-muted-foreground">by {featured[featuredIndex].author}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button>{featured[featuredIndex].installed ? 'Installed' : 'Install'}</Button>
                  {featured[featuredIndex].installed && (
                    <Button variant="outline" onClick={() => { setSelectedPlugin(featured[featuredIndex].id); setConfigureOpen(true) }}>
                      <Settings2 className="h-4 w-4 mr-1" />Configure
                    </Button>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" onClick={() => setFeaturedIndex(i => (i + 1) % featured.length)}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="marketplace" className="gap-2"><Store className="h-4 w-4" />Marketplace</TabsTrigger>
          <TabsTrigger value="installed" className="gap-2"><Download className="h-4 w-4" />My Plugins ({pluginList.filter(p => p.installed).length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Layout: Categories Sidebar + Plugin Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Categories Sidebar */}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</p>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                categoryFilter === cat.id ? 'bg-accent font-medium' : 'hover:bg-accent/50'
              }`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              <span className="flex items-center justify-between">
                {cat.name}
                <span className="text-xs text-muted-foreground">{cat.count}</span>
              </span>
            </button>
          ))}
        </div>

        {/* Plugin Grid */}
        <div className="space-y-4">
          {/* Search & Type Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 forge-input-glow" placeholder="Search plugins by name, author, or description..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={v => setTypeFilter(v as PluginType | 'all')}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="All types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {PLUGIN_TYPES.map(t => <SelectItem key={t} value={t}>{PLUGIN_TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <CardContent className="py-16 text-center">
                <Puzzle className="h-12 w-12 mx-auto text-foreground/60" />
                <h3 className="mt-4 text-lg font-semibold">No plugins found</h3>
                <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setTypeFilter('all'); setCategoryFilter('all') }}>
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(plugin => (
                <Card key={plugin.id} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200 group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl shrink-0 group-hover:bg-primary/20 transition-colors">
                        {plugin.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <CardTitle className="text-sm truncate">{plugin.name}</CardTitle>
                          {plugin.verified && <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground">by {plugin.author} · v{plugin.version}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">{plugin.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{PLUGIN_TYPE_LABELS[plugin.type]}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <RatingStars rating={plugin.rating} />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Download className="h-3 w-3" />{plugin.installs.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        variant={plugin.installed ? 'outline' : 'default'}
                        size="sm"
                      >
                        {plugin.installed ? (
                          <><CheckCircle className="h-3.5 w-3.5 mr-1" />Installed</>
                        ) : (
                          <><Download className="h-3.5 w-3.5 mr-1" />Install</>
                        )}
                      </Button>
                      {plugin.installed && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelectedPlugin(plugin.id); setConfigureOpen(true) }}
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><ExternalLink className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                          <DropdownMenuItem><Shield className="h-4 w-4 mr-2" />Permissions</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Configure Dialog */}
      <Dialog open={configureOpen} onOpenChange={setConfigureOpen}>
        <DialogContent className="sm:max-w-md forge-glass-elevated border-white/[0.06] rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Configure Plugin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPlugin && (() => {
              const plugin = pluginList.find(p => p.id === selectedPlugin)
              if (!plugin) return null
              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">{plugin.icon}</div>
                    <div>
                      <p className="font-medium">{plugin.name}</p>
                      <p className="text-xs text-muted-foreground">v{plugin.version} by {plugin.author}</p>
                    </div>
                  </div>
                  <div className="space-y-3 p-4 rounded-md border bg-muted/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="default" className="text-xs">Enabled</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium">{PLUGIN_TYPE_LABELS[plugin.type]}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rating</span>
                      <RatingStars rating={plugin.rating} />
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfigureOpen(false)}>Close</Button>
            <Button onClick={() => setConfigureOpen(false)}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
