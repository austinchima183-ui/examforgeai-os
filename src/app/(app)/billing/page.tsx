import { requireAuth } from '@/lib/auth/require-auth'
import { resolveIcon } from '@/lib/design/icon-registry'
import { CreditCard, Download, ArrowUpRight, CheckCircle2, Clock, AlertCircle, Receipt, Crown, Zap, Users, BookOpen, HardDrive, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { getBillingData } from '@/lib/services/billing-service'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Billing Page
// ============================================================================
// Server Component. Displays billing data from Supabase.
// No mock data. All plans, invoices, and usage are live.
// Premium AI OS visual treatment applied.
// ============================================================================

const statusIconMap: Record<string, typeof CheckCircle2> = {
  successful: CheckCircle2,
  pending: Clock,
  failed: AlertCircle,
  refunded: ArrowUpRight,
}

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  successful: 'default',
  pending: 'secondary',
  failed: 'destructive',
  refunded: 'outline',
  processing: 'secondary',
}

function formatCurrency(amount: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency === 'NGN' ? 'NGN' : 'USD',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function BillingPage() {
  const { user } = await requireAuth()

  // Fetch live billing data from Supabase
  const data = await getBillingData(user.id)

  const isPremiumPlan = data.currentPlan?.tier !== 'free'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Manage your subscription, view invoices, and track usage.</p>
        </div>
        {isPremiumPlan && (
          <Badge className="forge-glow gap-1.5 bg-primary/15 text-primary border border-primary/25 px-3 py-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Premium Active
          </Badge>
        )}
      </div>

      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-border/60 via-border/30 to-transparent" />

      {/* Current Plan & Upgrade */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Current Plan */}
        <Card className={`relative overflow-hidden forge-glass-surface border rounded-xl forge-card-shadow ${isPremiumPlan ? 'border-primary/30 forge-glow' : 'border-white/[0.04]'}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight">Current Plan</CardTitle>
                <CardDescription>Your active subscription</CardDescription>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isPremiumPlan ? 'bg-primary/15 border border-white/[0.04]' : 'bg-secondary/50 border-white/[0.04]'}`}>
                <Crown className={`h-5 w-5 ${isPremiumPlan ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{data.currentPlan?.name ?? 'Free'}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="text-3xl font-bold text-foreground">{formatCurrency(data.currentPlan?.price ?? 0, data.currentPlan?.currency ?? 'NGN')}</span>
                    <span className="text-muted-foreground">/{data.currentPlan?.billingCycle ?? 'monthly'}</span>
                  </p>
                </div>
                <Badge variant={isPremiumPlan ? 'default' : 'secondary'} className={isPremiumPlan ? 'bg-primary/15 text-primary border border-primary/25' : ''}>
                  {data.currentPlan?.tier?.toUpperCase() ?? 'FREE'}
                </Badge>
              </div>

              {data.currentPlan?.features && data.currentPlan.features.length > 0 && (
                <div className="space-y-2.5">
                  {data.currentPlan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-sm">
                      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/15 border border-white/[0.04]">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              )}

              {data.upcomingInvoice && (
                <div className="p-3 rounded-lg bg-secondary/50 border-white/[0.04]">
                  <p className="text-xs text-muted-foreground">Next billing date</p>
                  <p className="text-sm font-medium mt-0.5">{formatDate(data.upcomingInvoice.date)} — {formatCurrency(data.upcomingInvoice.amount, data.upcomingInvoice.currency)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upgrade Card */}
        <Card className="relative overflow-hidden forge-glass-surface border border-white/[0.04] rounded-xl forge-card-shadow forge-glow">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent pointer-events-none" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight">Upgrade Plan</CardTitle>
                <CardDescription>Get more features and capacity</CardDescription>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 border border-white/[0.04]">
                <Zap className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-5">
              <div>
                <h3 className="text-2xl font-bold tracking-tight">Professional</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Unlock unlimited exams, AI-powered question generation, advanced analytics, and priority support.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: 'users', label: 'Unlimited Students' },
                  { icon: 'book-open', label: 'Unlimited Exams' },
                  { icon: 'sparkles', label: 'AI Questions' },
                  { icon: 'hard-drive', label: '50 GB Storage' },
                ].map((item, idx) => {
                  const Icon = resolveIcon(item.icon) ?? Zap
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/15">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </div>
                  )
                })}
              </div>
              <Button className="w-full forge-glow" asChild>
                <Link href="/billing/plans"><ArrowUpRight className="h-4 w-4 mr-2" />Upgrade Now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-border/60 via-border/30 to-transparent" />

      {/* Usage Stats */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold tracking-tight">Usage</CardTitle>
          </div>
          <CardDescription>Current billing period usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {[
              { label: 'Students', used: data.usage.studentsUsed, limit: data.usage.studentsLimit, icon: 'users', color: 'primary' },
              { label: 'AI Questions', used: data.usage.aiQuestionsUsed, limit: data.usage.aiQuestionsLimit, icon: 'sparkles', color: 'neural' },
              { label: 'Exams', used: data.usage.examsUsed, limit: data.usage.examsLimit, icon: 'book-open', color: 'ember' },
              { label: 'Storage', used: data.usage.storageUsedGb, limit: data.usage.storageLimitGb, icon: 'hard-drive', color: 'emerald-500', suffix: ' GB' },
            ].map((item, idx) => {
              const isUnlimited = item.limit === 999
              const percentage = isUnlimited ? 10 : (item.used / item.limit) * 100
              const displayLimit = isUnlimited ? 'Unlimited' : `${item.limit}${item.suffix ?? ''}`

              const colorMap: Record<string, { track: string; fill: string; iconBg: string; iconBorder: string; iconColor: string }> = {
                primary: { track: 'bg-primary/20', fill: 'bg-primary', iconBg: 'bg-primary/15', iconBorder: 'border-primary/20', iconColor: 'text-primary' },
                neural: { track: 'bg-neural/20', fill: 'bg-neural', iconBg: 'bg-neural/15', iconBorder: 'border-neural/20', iconColor: 'text-neural' },
                ember: { track: 'bg-ember/20', fill: 'bg-ember', iconBg: 'bg-ember/15', iconBorder: 'border-ember/20', iconColor: 'text-ember' },
                'emerald-500': { track: 'bg-emerald-500/20', fill: 'bg-emerald-500', iconBg: 'bg-emerald-500/15', iconBorder: 'border-emerald-500/20', iconColor: 'text-emerald-500' },
              }
              const colors = colorMap[item.color] ?? colorMap.primary
              const Icon = resolveIcon(item.icon) ?? Zap

              return (
                <div key={idx} className="flex items-center gap-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.iconBg} border ${colors.iconBorder} shrink-0`}>
                    <Icon className={`h-4 w-4 ${colors.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.used}{item.suffix ?? ''} / {displayLimit}</span>
                    </div>
                    <div className={`h-2 rounded-full ${colors.track} overflow-hidden`}>
                      <div
                        className={`h-full rounded-full ${colors.fill} transition-all duration-500`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section Divider */}
      <div className="h-px bg-gradient-to-r from-border/60 via-border/30 to-transparent" />

      {/* Invoice History */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">Invoice History</CardTitle>
              <CardDescription>Your payment history and receipts</CardDescription>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50 border-white/[0.04]">
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.invoices.length > 0 ? (
            <div className="space-y-1">
              {data.invoices.map((invoice) => {
                const StatusIcon = statusIconMap[invoice.status] ?? Clock
                return (
                  <div key={invoice.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-hover/20 transition-all duration-200 group">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center border-white/[0.04] group-hover:border-white/[0.06] transition-colors">
                        <StatusIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{invoice.description}</p>
                        <p className="text-xs text-muted-foreground font-mono">{formatDate(invoice.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(invoice.amount, invoice.currency)}</span>
                      <Badge variant={statusVariantMap[invoice.status] ?? 'secondary'} className="text-[10px]">
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                      <a href={`/api/billing/invoice/${invoice.id}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/80 backdrop-blur-sm border-white/[0.04]">
                  <Receipt className="h-7 w-7 text-foreground/40" />
                </div>
              </div>
              <p className="text-base font-medium text-foreground">No invoices yet</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs text-center">Invoices will appear here once you make a payment.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
