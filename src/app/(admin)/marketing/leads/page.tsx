'use client'

// ============================================================================
// ExamForge AI — Leads Management Page (Admin)
// ============================================================================
// Client component with data table, search/filter by stage, score_tier, source.
// Color-coded score tiers and stage badges. Links to lead detail.
// ============================================================================

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  Search,
  Filter,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import type { Lead } from '@/lib/supabase/marketing-types'

// ── Score Tier Colors ──

const tierColors: Record<string, string> = {
  hot: 'bg-destructive/100/10 text-destructive border-destructive/20',
  warm: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400 border-amber-500/20',
  cold: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
}

// ── Stage Badge Colors ──

const stageBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  new: 'secondary',
  contacted: 'secondary',
  qualified: 'default',
  proposal: 'default',
  negotiation: 'default',
  won: 'default',
  lost: 'destructive',
}

function StageBadge({ stage }: { stage: string }) {
  const label = stage.charAt(0).toUpperCase() + stage.slice(1)
  const variant = stageBadgeVariant[stage] || 'secondary'

  if (stage === 'won') {
    return <Badge className="bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border border-emerald-500/20">{label}</Badge>
  }
  if (stage === 'qualified') {
    return <Badge className="bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400 border border-amber-500/20">{label}</Badge>
  }
  if (stage === 'proposal') {
    return <Badge className="bg-orange-500/10 text-orange-600 border border-orange-500/20">{label}</Badge>
  }

  return <Badge variant={variant}>{label}</Badge>
}

function ScoreTierBadge({ tier }: { tier: string}) {
  const colorClass = tierColors[tier] || 'bg-muted text-muted-foreground'
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${colorClass}`}>
      {tier.charAt(0).toUpperCase() + tier.slice(1)}
    </span>
  )
}

// ── Main Component ──

export default function LeadsManagementPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (stageFilter && stageFilter !== 'all') params.set('stage', stageFilter)
      if (tierFilter && tierFilter !== 'all') params.set('scoreTier', tierFilter)
      if (sourceFilter && sourceFilter !== 'all') params.set('source', sourceFilter)

      const res = await fetch(`/api/marketing/leads?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
      } else {
        setLeads([])
      }
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }, [search, stageFilter, tierFilter, sourceFilter])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight tracking-tight">Leads Management</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all marketing leads with filtering and scoring.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Score Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="organic">Organic</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">No leads found.</p>
              <p className="text-sm text-foreground/55 mt-1">
                Adjust filters or wait for new leads to arrive.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
                <TableRow className="hover:bg-white/[0.02] transition-colors">
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium text-sm">{lead.email}</TableCell>
                    <TableCell className="text-sm">
                      {lead.first_name || lead.last_name
                        ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">{lead.company || '—'}</TableCell>
                    <TableCell className="text-sm capitalize">{lead.source}</TableCell>
                    <TableCell>
                      <StageBadge stage={lead.stage} />
                    </TableCell>
                    <TableCell className="text-sm font-mono">{lead.score}</TableCell>
                    <TableCell>
                      <ScoreTierBadge tier={lead.score_tier} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lead.last_activity_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/marketing/leads/${lead.id}`}
                        className="text-primary hover:text-primary/80"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Count */}
      {!loading && leads.length > 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
