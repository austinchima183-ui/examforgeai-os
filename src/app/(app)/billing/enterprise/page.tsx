'use client'

import { useState, useCallback, useEffect } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, FileText,
  Tag, BarChart3, Search, Plus, Receipt, RefreshCw
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

// ── Types ────────────────────────────────────────────────────────
interface RevenueMetrics {
  mrr: number
  arr: number
  churnRate: number
  outstandingRevenue: number
  mrrChange: number
  arrChange: number
  churnChange: number
  outstandingChange: number
}

interface RevenueTrendPoint {
  month: string
  revenue: number
  projected: number
}

interface RevenueByPlan {
  tier: string
  mrr: number
  percentage: number
  color: string
}

interface Invoice {
  id: string
  number: string
  org: string
  amount: number
  status: 'draft' | 'sent' | 'paid' | 'void'
  date: string
  dueDate: string
}

interface Subscription {
  id: string
  org: string
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  seats: number
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  mrr: number
  renewalDate: string
}

interface Coupon {
  id: string
  code: string
  name: string
  type: 'percentage' | 'fixed'
  value: number
  uses: number
  maxUses: number | null
  active: boolean
  expiresAt: string | null
}

// ── Fallback Data ────────────────────────────────────────────────
const FALLBACK_METRICS: RevenueMetrics = {
  mrr: 48750, arr: 585000, churnRate: 2.3, outstandingRevenue: 12400,
  mrrChange: 4.8, arrChange: 12.3, churnChange: -0.5, outstandingChange: -8.5,
}

const FALLBACK_TREND: RevenueTrendPoint[] = [
  { month: 'Jan', revenue: 38000, projected: 38000 },
  { month: 'Feb', revenue: 40200, projected: 40200 },
  { month: 'Mar', revenue: 42100, projected: 42100 },
  { month: 'Apr', revenue: 44300, projected: 44300 },
  { month: 'May', revenue: 46500, projected: 46500 },
  { month: 'Jun', revenue: 48750, projected: 48750 },
  { month: 'Jul', revenue: 0, projected: 51200 },
  { month: 'Aug', revenue: 0, projected: 53800 },
]

const FALLBACK_PLANS: RevenueByPlan[] = [
  { tier: 'Enterprise', mrr: 25000, percentage: 51.3, color: '#7c3aed' },
  { tier: 'Professional', mrr: 15000, percentage: 30.8, color: '#0ea5e9' },
  { tier: 'Starter', mrr: 6250, percentage: 12.8, color: '#10b981' },
  { tier: 'Free', mrr: 2500, percentage: 5.1, color: '#94a3b8' },
]

const FALLBACK_INVOICES: Invoice[] = [
  { id: 'inv1', number: 'INV-2024-001', org: 'Lagos District Board', amount: 12500, status: 'paid', date: '2024-06-01', dueDate: '2024-07-01' },
  { id: 'inv2', number: 'INV-2024-002', org: 'Kenya Ministry of Education', amount: 8750, status: 'sent', date: '2024-06-05', dueDate: '2024-07-05' },
  { id: 'inv3', number: 'INV-2024-003', org: 'Abuja Regional Authority', amount: 15000, status: 'paid', date: '2024-05-15', dueDate: '2024-06-15' },
  { id: 'inv4', number: 'INV-2024-004', org: 'Ghana Schools Network', amount: 6200, status: 'sent', date: '2024-05-01', dueDate: '2024-06-01' },
  { id: 'inv5', number: 'INV-2024-005', org: 'South Africa University', amount: 25000, status: 'draft', date: '2024-06-10', dueDate: '2024-07-10' },
  { id: 'inv6', number: 'INV-2024-006', org: 'Tanzania Education Hub', amount: 3200, status: 'void', date: '2024-04-20', dueDate: '2024-05-20' },
]

const FALLBACK_SUBSCRIPTIONS: Subscription[] = [
  { id: 's1', org: 'Lagos District Board', plan: 'enterprise', seats: 500, status: 'active', mrr: 12500, renewalDate: '2024-07-01' },
  { id: 's2', org: 'Kenya Ministry of Education', plan: 'professional', seats: 200, status: 'active', mrr: 8750, renewalDate: '2024-07-05' },
  { id: 's3', org: 'Abuja Regional Authority', plan: 'enterprise', seats: 300, status: 'active', mrr: 15000, renewalDate: '2024-06-15' },
  { id: 's4', org: 'Ghana Schools Network', plan: 'starter', seats: 50, status: 'past_due', mrr: 6200, renewalDate: '2024-06-01' },
  { id: 's5', org: 'Rwanda Digital Academy', plan: 'professional', seats: 120, status: 'trialing', mrr: 5250, renewalDate: '2024-07-20' },
  { id: 's6', org: 'Sample School (Dev)', plan: 'free', seats: 10, status: 'active', mrr: 0, renewalDate: 'N/A' },
]

const FALLBACK_COUPONS: Coupon[] = [
  { id: 'c1', code: 'LAUNCH20', name: 'Launch Discount', type: 'percentage', value: 20, uses: 145, maxUses: 500, active: true, expiresAt: '2024-12-31' },
  { id: 'c2', code: 'EDU100', name: 'Education Grant', type: 'fixed', value: 100, uses: 23, maxUses: null, active: true, expiresAt: null },
  { id: 'c3', code: 'SUMMER23', name: 'Summer Promo', type: 'percentage', value: 15, uses: 500, maxUses: 500, active: false, expiresAt: '2024-09-30' },
  { id: 'c4', code: 'GOV25', name: 'Government Discount', type: 'percentage', value: 25, uses: 12, maxUses: 100, active: true, expiresAt: '2025-01-01' },
]

interface BillingRevenueData {
  metrics?: RevenueMetrics
  trend?: RevenueTrendPoint[]
  byPlan?: RevenueByPlan[]
  invoices?: Invoice[]
  subscriptions?: Subscription[]
  coupons?: Coupon[]
}

// ── Formatting ───────────────────────────────────────────────────
function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toLocaleString()}`
}

function formatNumber(value: number): string {
  return value.toLocaleString()
}

// ── Status Config ─────────────────────────────────────────────────
const INV_STATUS_CONFIG: Record<Invoice['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { label: 'Paid', variant: 'default' },
  sent: { label: 'Sent', variant: 'secondary' },
  draft: { label: 'Draft', variant: 'outline' },
  void: { label: 'Void', variant: 'destructive' },
}

const PLAN_BADGE: Record<Subscription['plan'], string> = {
  enterprise: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  professional: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  starter: 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900/40 dark:text-green-400',
  free: 'bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300',
}

const SUB_STATUS_CONFIG: Record<Subscription['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Active', variant: 'default' },
  past_due: { label: 'Past Due', variant: 'destructive' },
  canceled: { label: 'Canceled', variant: 'outline' },
  trialing: { label: 'Trialing', variant: 'secondary' },
}

// ── Recharts Tooltip ─────────────────────────────────────────────
function RevenueTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
          {entry.dataKey === 'projected' ? 'Projected' : 'Revenue'}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────
export default function EnterpriseBillingPage() {
  const [activeTab, setActiveTab] = useState('invoices')
  const [invoiceSearch, setInvoiceSearch] = useState('')

  const { data: billingData, loading, error, refetch } = useApi<BillingRevenueData>('/api/billing/revenue')
  const [metrics, setMetrics] = useState<RevenueMetrics>(FALLBACK_METRICS)
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>(FALLBACK_TREND)
  const [revenueByPlan, setRevenueByPlan] = useState<RevenueByPlan[]>(FALLBACK_PLANS)
  const [invoices, setInvoices] = useState<Invoice[]>(FALLBACK_INVOICES)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(FALLBACK_SUBSCRIPTIONS)
  const [coupons, setCoupons] = useState<Coupon[]>(FALLBACK_COUPONS)

  useEffect(() => {
    if (billingData) {
      if (billingData.metrics) setMetrics(billingData.metrics)
      if (billingData.trend) setRevenueTrend(billingData.trend)
      if (billingData.byPlan) setRevenueByPlan(billingData.byPlan)
      if (billingData.invoices) setInvoices(billingData.invoices)
      if (billingData.subscriptions) setSubscriptions(billingData.subscriptions)
      if (billingData.coupons) setCoupons(billingData.coupons)
    }
  }, [billingData])

  const filteredInvoices = invoices.filter(inv =>
    !invoiceSearch ||
    inv.number.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    inv.org.toLowerCase().includes(invoiceSearch.toLowerCase())
  )

  const totalCouponUses = coupons.reduce((sum, c) => sum + c.uses, 0)
  const activeCoupons = coupons.filter(c => c.active).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/billing/enterprise">Enterprise Billing</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Billing</h1>
          <p className="text-muted-foreground">Revenue dashboard, invoicing & subscription management</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />MRR
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24 mb-1" /> : <p className="text-2xl font-bold">${formatNumber(metrics.mrr)}</p>}
            {loading ? <Skeleton className="h-4 w-16" /> : (
              <p className={`text-xs flex items-center gap-1 ${metrics.mrrChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                {metrics.mrrChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {metrics.mrrChange >= 0 ? '+' : ''}{metrics.mrrChange}% vs last month
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-sky-600" />ARR
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24 mb-1" /> : <p className="text-2xl font-bold">${formatNumber(metrics.arr)}</p>}
            {loading ? <Skeleton className="h-4 w-16" /> : (
              <p className={`text-xs flex items-center gap-1 ${metrics.arrChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                {metrics.arrChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {metrics.arrChange >= 0 ? '+' : ''}{metrics.arrChange}% YoY
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />Churn Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24 mb-1" /> : <p className="text-2xl font-bold">{metrics.churnRate}%</p>}
            {loading ? <Skeleton className="h-4 w-16" /> : (
              <p className={`text-xs flex items-center gap-1 ${metrics.churnChange <= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                {metrics.churnChange <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {metrics.churnChange <= 0 ? '' : '+'}{metrics.churnChange}% — {metrics.churnRate <= 3 ? 'Below target' : 'Above target'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-rose-600" />Outstanding
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-8 w-24 mb-1" /> : <p className="text-2xl font-bold">${formatNumber(metrics.outstandingRevenue)}</p>}
            {loading ? <Skeleton className="h-4 w-16" /> : (
              <p className={`text-xs flex items-center gap-1 ${metrics.outstandingChange <= 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                {metrics.outstandingChange <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {Math.abs(metrics.outstandingChange)}% — {invoices.filter(i => i.status === 'sent').length} pending invoices
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Area Chart */}
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />Revenue Trend
            </CardTitle>
            <CardDescription>Monthly recurring revenue with projections</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={v => formatCurrency(v)} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2} fill="url(#revenueGrad)" />
                  <Area type="monotone" dataKey="projected" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="5 5" fill="url(#projGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Plan Pie Chart */}
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />Revenue by Plan
            </CardTitle>
            <CardDescription>MRR distribution across subscription tiers</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={revenueByPlan}
                      dataKey="mrr"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {revenueByPlan.map((entry) => (
                        <Cell key={entry.tier} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: unknown) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 w-full">
                  {revenueByPlan.map(plan => (
                    <div key={plan.tier} className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: plan.color }} />
                      <span className="text-muted-foreground">{plan.tier}</span>
                      <span className="font-medium ml-auto">{plan.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Invoices / Subscriptions / Coupons */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices" className="gap-2"><FileText className="h-4 w-4" />Invoices</TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-2"><CreditCard className="h-4 w-4" />Subscriptions</TabsTrigger>
          <TabsTrigger value="coupons" className="gap-2"><Tag className="h-4 w-4" />Coupons</TabsTrigger>
        </TabsList>

        {/* ── Invoices Tab ─────────────────────────────────────── */}
        <TabsContent value="invoices" className="mt-6">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Recent Invoices</CardTitle>
                <CardDescription>{invoices.length} invoices totaling {formatCurrency(invoices.reduce((s, i) => s + i.amount, 0))}</CardDescription>
              </div>
              <div className="relative w-full max-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 forge-input-glow" placeholder="Search invoices..." value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : filteredInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No invoices found</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
                      <TableRow className="hover:bg-white/[0.02] transition-colors">
                        <TableHead>Invoice</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Issued</TableHead>
                        <TableHead>Due</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map(inv => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium font-mono text-sm">{inv.number}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{inv.org}</TableCell>
                          <TableCell className="font-medium">${formatNumber(inv.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={INV_STATUS_CONFIG[inv.status].variant}>
                              {INV_STATUS_CONFIG[inv.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv.date}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv.dueDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Subscriptions Tab ────────────────────────────────── */}
        <TabsContent value="subscriptions" className="mt-6">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>{subscriptions.length} organizations across all plan tiers</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : subscriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No subscriptions found</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
                      <TableRow className="hover:bg-white/[0.02] transition-colors">
                        <TableHead>Organization</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Seats</TableHead>
                        <TableHead>MRR</TableHead>
                        <TableHead>Renewal</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map(sub => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">{sub.org}</TableCell>
                          <TableCell>
                            <Badge className={PLAN_BADGE[sub.plan]}>{sub.plan.charAt(0).toUpperCase() + sub.plan.slice(1)}</Badge>
                          </TableCell>
                          <TableCell>{formatNumber(sub.seats)}</TableCell>
                          <TableCell className="font-medium">{sub.mrr > 0 ? `$${formatNumber(sub.mrr)}` : '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{sub.renewalDate}</TableCell>
                          <TableCell>
                            <Badge variant={SUB_STATUS_CONFIG[sub.status].variant}>
                              {SUB_STATUS_CONFIG[sub.status].label}
                            </Badge>
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

        {/* ── Coupons Tab ──────────────────────────────────────── */}
        <TabsContent value="coupons" className="mt-6">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Tag className="h-5 w-5" />Coupons</CardTitle>
                <CardDescription>{activeCoupons} active · {totalCouponUses} total redemptions</CardDescription>
              </div>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Create Coupon</Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : coupons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Tag className="h-12 w-12 mb-3 opacity-30" />
                  <p className="text-sm">No coupons configured</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
                      <TableRow className="hover:bg-white/[0.02] transition-colors">
                        <TableHead>Code</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Uses</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupons.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">{c.code}</code>
                          </TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.type === 'percentage' ? `${c.value}%` : `$${c.value}`}</TableCell>
                          <TableCell>
                            {c.uses}{c.maxUses ? ` / ${c.maxUses}` : ''}
                            {c.maxUses && <div className="mt-1 h-1.5 w-20 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((c.uses / c.maxUses) * 100, 100)}%` }} /></div>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{c.expiresAt ?? 'Never'}</TableCell>
                          <TableCell>
                            <Badge variant={c.active ? 'default' : 'secondary'}>{c.active ? 'Active' : 'Inactive'}</Badge>
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
      </Tabs>
    </div>
  )
}
