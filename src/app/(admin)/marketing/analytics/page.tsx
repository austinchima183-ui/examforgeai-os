'use client'

// ============================================================================
// ExamForge AI — Marketing Analytics Page (Admin)
// ============================================================================
// Shows event counts by type, top pages, conversion funnel, source distribution.
// ============================================================================

import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Globe,
  MousePointerClick,
  Target,
  Inbox,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ── Types ──

interface AnalyticsAggregations {
  eventsByType: Record<string, number>
  topPages: Record<string, number>
  sourceDistribution: Record<string, number>
  totalEvents: number
}

// ── Sort helper ──

function sortedEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1])
}

// ── Bar Chart Component ──

function HorizontalBarChart({
  data,
  maxBars = 10,
  barColor = 'bg-primary',
}: {
  data: Record<string, number>
  maxBars?: number
  barColor?: string
}) {
  const entries = sortedEntries(data).slice(0, maxBars)
  const maxVal = Math.max(...entries.map(([, v]) => v), 1)

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Inbox className="h-8 w-8 text-foreground/20 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 animate-fade-in">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-3">
          <span className="w-32 text-sm text-right truncate" title={key}>
            {key}
          </span>
          <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden relative">
            <div
              className={`h-full ${barColor} rounded-md transition-all duration-500`}
              style={{ width: `${(value / maxVal) * 100}%` }}
            />
          </div>
          <span className="w-12 text-sm text-muted-foreground text-right">{value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Conversion Funnel ──

function ConversionFunnel({ eventsByType }: { eventsByType: Record<string, number> }) {
  const funnelSteps = [
    { label: 'Page View', key: 'page_view', color: 'bg-sky-500' },
    { label: 'CTA Click', key: 'cta_click', color: 'bg-primary/100' },
    { label: 'Form Start', key: 'form_start', color: 'bg-yellow-50 dark:bg-yellow-9500' },
    { label: 'Form Complete', key: 'form_complete', color: 'bg-orange-500' },
    { label: 'Registration', key: 'registration_complete', color: 'bg-green-50 dark:bg-green-9500' },
  ]

  const values = funnelSteps.map(step => eventsByType[step.key] || 0)
  const maxVal = Math.max(...values, 1)

  return (
    <div className="space-y-3">
      {funnelSteps.map((step, i) => {
        const value = values[i]
        const prevValue = i > 0 ? values[i - 1] : 0
        const conversionRate = prevValue > 0 ? Math.round((value / prevValue) * 100) : 0

        return (
          <div key={step.key} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{step.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{value}</span>
                {i > 0 && prevValue > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {conversionRate}% from previous
                  </Badge>
                )}
              </div>
            </div>
            <div className="h-8 bg-muted rounded-md overflow-hidden relative">
              <div
                className={`h-full ${step.color} rounded-md transition-all duration-500`}
                style={{ width: `${(value / maxVal) * 100}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Component ──

export default function MarketingAnalyticsPage() {
  const [data, setData] = useState<AnalyticsAggregations | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/marketing/analytics')
        if (res.ok) {
          const result = await res.json()
          setData(result)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight tracking-tight">Marketing Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track CTA performance, conversion funnel, and traffic sources.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{data?.totalEvents || 0}</div>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">CTA Clicks</CardTitle>
                <Target className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-primary">
                  {data?.eventsByType.cta_click || 0}
                </div>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unique Pages</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">
                  {Object.keys(data?.topPages || {}).length}
                </div>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Traffic Sources</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">
                  {Object.keys(data?.sourceDistribution || {}).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs: Funnel / Events / Pages / Sources */}
          <Tabs defaultValue="funnel">
            <TabsList>
              <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="pages">Top Pages</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
            </TabsList>

            <TabsContent value="funnel">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Conversion Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ConversionFunnel eventsByType={data?.eventsByType || {}} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MousePointerClick className="h-5 w-5" />
                    Events by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HorizontalBarChart data={data?.eventsByType || {}} barColor="bg-primary" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pages">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Top Pages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HorizontalBarChart data={data?.topPages || {}} barColor="bg-sky-500" />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sources">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Traffic Sources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HorizontalBarChart data={data?.sourceDistribution || {}} barColor="bg-yellow-50 dark:bg-yellow-9500" />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
