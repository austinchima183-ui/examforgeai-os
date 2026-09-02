'use client'

// ============================================================================
// ExamForge AI — AI Usage Analytics Tab (Ω-FINAL/Phase 4c)
// ============================================================================
// Surfaces /api/ai/usage: tokens, cost, latency, provider/status mix, and
// recent generation history from ai_generation_requests. Mounted on the
// Analytics page for school_admin / super_admin (the API 403s other roles —
// handled with a quiet note instead of an error state).
// ============================================================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart } from '@/components/charts/bar-chart'
import { Sparkles, Loader2, AlertCircle, Cpu, Coins, Zap, Clock } from 'lucide-react'

interface AiUsageStats {
  totalGenerations: number
  totalTokens: number
  totalCost: number
  byProvider: Record<string, number>
  byStatus: Record<string, number>
  avgDurationMs: number
}

interface AiGenerationRow {
  id: string
  provider?: string
  model?: string
  status?: string
  tokens_input?: number | null
  tokens_output?: number | null
  cost_usd?: number | null
  duration_ms?: number | null
  error_message?: string | null
  created_at?: string
}

interface AiUsageResponse {
  scope: 'global' | 'school'
  schoolId: string | null
  stats: AiUsageStats
  recent: { generations: AiGenerationRow[]; total: number }
  note?: string
}

export function AiUsageTab() {
  const [data, setData] = useState<AiUsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function fetchUsage() {
      setLoading(true)
      setError(null)
      setForbidden(false)
      try {
        const res = await fetch('/api/ai/usage', { signal })
        if (res.status === 403) {
          setForbidden(true)
          return
        }
        if (!res.ok) throw new Error('Failed to load AI usage analytics')
        const json = (await res.json()) as AiUsageResponse
        if (!signal.aborted) setData(json)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Unexpected error')
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }

    fetchUsage()
    return () => controller.abort()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading AI usage…</p>
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardContent className="p-8 text-center space-y-2">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            AI usage analytics is available to school administrators.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="forge-glass-surface border border-destructive/30 rounded-xl">
        <CardContent className="p-8 text-center space-y-2">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { stats, recent } = data
  const providerData = Object.entries(stats.byProvider).map(([provider, count]) => ({
    provider,
    count,
  }))
  const recentRows = recent.generations ?? []
  const failureCount = Object.entries(stats.byStatus)
    .filter(([s]) => s !== 'success' && s !== 'completed')
    .reduce((acc, [, c]) => acc + c, 0)

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Cpu className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium">Total Generations</p>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {stats.totalGenerations.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.scope === 'global' ? 'All schools' : 'Your school'}
            </p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4 text-ember" />
              <p className="text-xs font-medium">Tokens Processed</p>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {stats.totalTokens.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">input + output</p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Coins className="h-4 w-4 text-neural" />
              <p className="text-xs font-medium">Estimated Cost</p>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              ${stats.totalCost.toFixed(4)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">tracked per request</p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-emerald-500" />
              <p className="text-xs font-medium">Avg Latency</p>
            </div>
            <p className="mt-2 text-2xl font-bold tracking-tight">
              {Math.round(stats.avgDurationMs).toLocaleString()} ms
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {failureCount > 0 ? `${failureCount} non-success requests` : 'all requests successful'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Provider mix + recent history */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight">Requests by Provider</CardTitle>
            <CardDescription>Which AI providers serve the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {providerData.length > 0 ? (
              <BarChart
                data={providerData}
                xKey="provider"
                yKeys={['count']}
                colors={['hsl(var(--chart-2))']}
                height={280}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Sparkles className="h-6 w-6 mb-3 opacity-50" />
                <p className="text-sm">No AI requests recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight">Recent Generations</CardTitle>
            <CardDescription>
              {recent.total} tracked{recent.total > recentRows.length ? ` — showing latest ${recentRows.length}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentRows.length > 0 ? (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                {recentRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.04] bg-secondary/30 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">
                        {(row.provider ?? 'unknown') + (row.model ? ` · ${row.model}` : '')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                        {row.duration_ms ? ` · ${Math.round(row.duration_ms)}ms` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {typeof row.cost_usd === 'number' && (
                        <span className="text-[11px] text-muted-foreground">
                          ${row.cost_usd.toFixed(5)}
                        </span>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          row.status === 'success' || row.status === 'completed'
                            ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'text-destructive border-destructive/30'
                        }
                      >
                        {row.status ?? 'unknown'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <Sparkles className="h-6 w-6 mb-3 opacity-50" />
                <p className="text-sm">No generations recorded yet</p>
                <p className="text-xs mt-1">Usage appears here after the first AI request.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
