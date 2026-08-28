'use client'

import { useState, useMemo } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, Globe, GraduationCap, AlertTriangle, TrendingDown, TrendingUp, CheckCircle2, Download, Filter } from 'lucide-react'
import { toast } from 'sonner'

// ============================================================================
// ExamForge AI — Government Education Analytics
// ============================================================================

const regions = ['All Regions', 'North Central', 'North East', 'North West', 'South East', 'South South', 'South West']

interface SchoolRanking {
  id: string
  name: string
  region: string
  students: number
  avgScore: number
  passRate: number
  trend: 'up' | 'down' | 'stable'
}

interface CurriculumMetric {
  subject: string
  coverage: number
  alignment: number
  gaps: number
  schools: number
}

interface ComplianceCheck {
  item: string
  status: 'good' | 'warning' | 'critical'
  compliant: number
  total: number
}

interface GovernmentData {
  schoolRankings: SchoolRanking[]
  curriculumMetrics: CurriculumMetric[]
  complianceChecks: ComplianceCheck[]
}

export default function GovernmentAnalyticsPage() {
  const { user } = useAuthStore()
  const [selectedRegion, setSelectedRegion] = useState('All Regions')

  const { data: govData, loading, error } = useApi<GovernmentData>('/api/ai/government')
  const schoolRankings = govData?.schoolRankings ?? []
  const curriculumMetrics = govData?.curriculumMetrics ?? []
  const complianceChecks = govData?.complianceChecks ?? []

  const filteredSchools = selectedRegion === 'All Regions'
    ? schoolRankings
    : schoolRankings.filter(s => s.region === selectedRegion)

  const belowBenchmark = filteredSchools.filter(s => s.avgScore < 60)
  const atRisk = filteredSchools.filter(s => s.passRate < 70)

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Government Education Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Regional oversight, compliance monitoring, and performance analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedRegion} onValueChange={setSelectedRegion}>
            <SelectTrigger className="w-[180px] forge-input-glow">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {regions.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => {
            const csvRows = ['Name,Region,Students,Avg Score,Pass Rate,Status']
            filteredSchools.forEach(s => {
              csvRows.push(`${s.name},${s.region},${s.students},${s.avgScore},${s.passRate},${s.avgScore >= 60 ? 'Above' : 'Below'} Benchmark`)
            })
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `government-report-${selectedRegion.replace(/\s+/g, '-')}.csv`; a.click()
            URL.revokeObjectURL(url)
            toast.success('Report exported successfully')
          }}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Alert Banners */}
      {belowBenchmark.length > 0 && (
        <Card className="forge-glass-surface border-red-500/20 rounded-xl forge-card-shadow">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-red-400">
                {belowBenchmark.length} school{belowBenchmark.length > 1 ? 's' : ''} below performance benchmark
              </p>
              <p className="text-sm text-destructive/80">
                {'Schools scoring below 60% require intervention: '}{belowBenchmark.map(s => s.name).join(', ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 border border-white/[0.04]">
              <Globe className="h-3.5 w-3.5 text-sky-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSchools.length}</div>
            <p className="text-xs text-muted-foreground">Active in {selectedRegion}</p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-white/[0.04]">
              <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredSchools.length > 0
                ? (filteredSchools.reduce((sum, s) => sum + s.avgScore, 0) / filteredSchools.length).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Across all schools</p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-red-500/20 rounded-xl forge-card-shadow hover:-translate-y-0.5 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk Schools</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{atRisk.length}</div>
            <p className="text-xs text-muted-foreground">Pass rate below 70%</p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-white/[0.04]">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSchools.reduce((sum, s) => sum + s.students, 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
        </TabsList>

        {/* School Rankings */}
        <TabsContent value="rankings" className="space-y-4">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>School Performance Rankings</CardTitle>
              <CardDescription>Ranked by average student performance across all exams</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredSchools.map((school, idx) => (
                  <div key={school.id} className="flex items-center gap-4 rounded-lg border border-white/[0.04] p-3 hover:bg-white/[0.02] transition-colors">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      idx < 3 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-white/[0.04] text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{school.name}</p>
                        {school.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-400" />}
                        {school.trend === 'down' && <TrendingDown className="h-4 w-4 text-destructive" />}
                        {school.avgScore < 60 && <Badge variant="destructive">Below Benchmark</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{school.region} | {school.students} students</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{school.avgScore}%</p>
                      <p className="text-sm text-muted-foreground">Pass: {school.passRate}%</p>
                    </div>
                    <div className="w-24">
                      <Progress value={school.avgScore} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Curriculum Monitoring */}
        <TabsContent value="curriculum" className="space-y-4">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>Curriculum Alignment Monitoring</CardTitle>
              <CardDescription>Track curriculum coverage and alignment with national standards*</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {curriculumMetrics.map(subject => (
                  <div key={subject.subject} className="space-y-2 rounded-lg border border-white/[0.04] p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{subject.subject}</p>
                        {subject.gaps > 5 && <Badge variant="destructive">{subject.gaps} gaps</Badge>}
                        {subject.gaps <= 5 && subject.gaps > 0 && <Badge variant="secondary">{subject.gaps} gaps</Badge>}
                        {subject.gaps === 0 && <Badge variant="default" className="bg-green-600">Aligned</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{subject.schools} schools</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Coverage</p>
                        <Progress value={subject.coverage} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{subject.coverage}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Alignment</p>
                        <Progress value={subject.alignment} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{subject.alignment}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Analysis */}
        <TabsContent value="performance" className="space-y-4">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>Regional Performance Analysis</CardTitle>
              <CardDescription>Performance trends and comparisons across regions and schools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {regions.filter(r => r !== 'All Regions').map(region => {
                const regionSchools = schoolRankings.filter(s => s.region === region)
                const avgScore = regionSchools.length > 0
                  ? (regionSchools.reduce((sum, s) => sum + s.avgScore, 0) / regionSchools.length).toFixed(1)
                  : 'N/A'
                const avgPass = regionSchools.length > 0
                  ? Math.round(regionSchools.reduce((sum, s) => sum + s.passRate, 0) / regionSchools.length)
                  : 0
                return (
                  <div key={region} className="flex items-center gap-4 rounded-lg border border-white/[0.04] p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{region}</p>
                      <p className="text-sm text-muted-foreground">{regionSchools.length} schools</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{avgScore}%</p>
                      <p className="text-sm text-muted-foreground">Avg pass: {avgPass}%</p>
                    </div>
                    <div className="w-32">
                      <Progress value={Number(avgScore) || 0} className="h-2" />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance */}
        <TabsContent value="compliance" className="space-y-4">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>Compliance Status</CardTitle>
              <CardDescription>Regulatory compliance and standards adherence across schools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {complianceChecks.map(check => (
                <div key={check.item} className="space-y-2 rounded-lg border border-white/[0.04] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {check.status === 'good' && <CheckCircle2 className="h-5 w-5 text-green-400" />}
                      {check.status === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-400" />}
                      {check.status === 'critical' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                      <p className="font-medium">{check.item}</p>
                    </div>
                    <Badge variant={check.status === 'good' ? 'default' : check.status === 'warning' ? 'secondary' : 'destructive'}>
                      {check.compliant}/{check.total}
                    </Badge>
                  </div>
                  <Progress value={(check.compliant / check.total) * 100} className="h-2" />
                  <p className="text-sm text-muted-foreground">
                    {((check.compliant / check.total) * 100).toFixed(1)}% compliance — {check.total - check.compliant} schools non-compliant
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interventions */}
        <TabsContent value="interventions" className="space-y-4">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>Intervention Recommendations</CardTitle>
              <CardDescription>AI-powered recommendations for schools needing support</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {belowBenchmark.map(school => (
                <div key={school.id} className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-red-400">{school.name}</p>
                      <p className="text-sm text-destructive/80">Score: {school.avgScore}% | Pass Rate: {school.passRate}%</p>
                    </div>
                    <Badge variant="destructive">Priority Intervention</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium">Recommended Actions:</p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li>Deploy additional teaching resources for core subjects</li>
                      <li>Implement remedial programs for underperforming students</li>
                      <li>Conduct teacher training workshops on exam preparation</li>
                      <li>Schedule monitoring visits and progress reviews</li>
                    </ul>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" disabled>Create Intervention Plan</Button>
                    <Button size="sm" variant="outline" disabled>Notify School Admin</Button>
                  </div>
                </div>
              ))}
              {belowBenchmark.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 blur-xl bg-green-500/10 rounded-full" />
                    <CheckCircle2 className="h-12 w-12 text-green-400 relative" />
                  </div>
                  <p className="text-lg font-medium">All Schools Above Benchmark</p>
                  <p className="text-sm text-muted-foreground">No intervention required at this time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
