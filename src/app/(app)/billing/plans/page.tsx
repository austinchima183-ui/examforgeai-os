import { requireAuth } from '@/lib/auth/require-auth'
import { resolveIcon } from '@/lib/design/icon-registry'
import { Check, X, Crown, Sparkles, Building2, Zap, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { PLAN_FEATURES } from '@/lib/billing/plan-features'
import { PLAN_HIERARCHY } from '@/lib/billing/plan-gate'
import type { PlanTier } from '@/lib/supabase/types'
import { getBillingData } from '@/lib/services/billing-service'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Billing Plans Page
// ============================================================================
// Shows all 4 plans with feature comparison table, highlights current plan,
// and provides CTA to upgrade/downgrade.
// ============================================================================

// Plan metadata
const PLANS: Array<{
  tier: PlanTier
  name: string
  description: string
  monthlyPriceUSD: number | null
  yearlyPriceUSD: number | null
  monthlyPriceNGN: number | null
  yearlyPriceNGN: number | null
  icon: string
  highlighted: boolean
  cta: string
}> = [
  {
    tier: 'free',
    name: 'Free',
    description: 'Get started with basic exam creation and delivery.',
    monthlyPriceUSD: 0,
    yearlyPriceUSD: 0,
    monthlyPriceNGN: 0,
    yearlyPriceNGN: 0,
    icon: 'zap',
    highlighted: false,
    cta: 'Current Plan',
  },
  {
    tier: 'starter',
    name: 'Starter',
    description: 'For individual schools starting with digital exams and AI tools.',
    monthlyPriceUSD: 49,
    yearlyPriceUSD: 39,
    monthlyPriceNGN: 73500,
    yearlyPriceNGN: 58500,
    icon: 'sparkles',
    highlighted: false,
    cta: 'Start Free Trial',
  },
  {
    tier: 'professional',
    name: 'Professional',
    description: 'For growing schools needing advanced analytics and full ERP.',
    monthlyPriceUSD: 149,
    yearlyPriceUSD: 119,
    monthlyPriceNGN: 223500,
    yearlyPriceNGN: 178500,
    icon: 'crown',
    highlighted: true,
    cta: 'Start Free Trial',
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'For school groups and organizations managing multiple institutions.',
    monthlyPriceUSD: null,
    yearlyPriceUSD: null,
    monthlyPriceNGN: null,
    yearlyPriceNGN: null,
    icon: 'building-2',
    highlighted: false,
    cta: 'Contact Sales',
  },
]

// Group features by category for the comparison table
const FEATURE_CATEGORIES: Array<{ label: string; features: string[] }> = [
  {
    label: 'AI Features',
    features: [
      'ai_question_generation',
      'ai_tutor',
      'ai_copilot',
      'ai_lesson_planning',
      'ai_grading_assistance',
      'ai_content_summarization',
      'ai_plagiarism_detection',
      'ai_adaptive_learning',
    ],
  },
  {
    label: 'Analytics & Reporting',
    features: [
      'predictive_analytics',
      'advanced_reports',
      'custom_report_templates',
      'data_export',
      'government_analytics',
      'enterprise_analytics',
    ],
  },
  {
    label: 'Security & Access',
    features: [
      'sso_saml',
      'developer_api',
      'webhook_access',
      'custom_roles',
      'role_based_access',
    ],
  },
  {
    label: 'Scale & Capacity',
    features: [
      'unlimited_students',
      'unlimited_teachers',
      'multi_campus',
      'bulk_import',
      'bulk_export',
    ],
  },
  {
    label: 'Integrations & Marketplace',
    features: [
      'plugin_marketplace',
      'advanced_integrations',
      'marketplace_sell',
      'marketplace_buy',
    ],
  },
  {
    label: 'Support',
    features: [
      'priority_support',
      'dedicated_account_manager',
    ],
  },
]

const FEATURE_LABELS: Record<string, string> = {
  ai_question_generation: 'AI Question Generation',
  ai_tutor: 'AI Tutor',
  ai_copilot: 'AI Copilot',
  ai_lesson_planning: 'AI Lesson Planning',
  ai_grading_assistance: 'AI Grading Assistance',
  ai_content_summarization: 'AI Content Summarization',
  ai_plagiarism_detection: 'AI Plagiarism Detection',
  ai_adaptive_learning: 'AI Adaptive Learning',
  predictive_analytics: 'Predictive Analytics',
  advanced_reports: 'Advanced Reports',
  custom_report_templates: 'Custom Report Templates',
  data_export: 'Data Export',
  government_analytics: 'Government Analytics',
  enterprise_analytics: 'Enterprise Analytics',
  sso_saml: 'SSO / SAML',
  developer_api: 'Developer API',
  webhook_access: 'Webhooks',
  custom_roles: 'Custom Roles',
  role_based_access: 'Role-Based Access',
  unlimited_students: 'Unlimited Students',
  unlimited_teachers: 'Unlimited Teachers',
  multi_campus: 'Multi-Campus',
  bulk_import: 'Bulk Import',
  bulk_export: 'Bulk Export',
  plugin_marketplace: 'Plugin Marketplace',
  advanced_integrations: 'Advanced Integrations',
  marketplace_sell: 'Sell on Marketplace',
  marketplace_buy: 'Buy on Marketplace',
  priority_support: 'Priority Support',
  dedicated_account_manager: 'Dedicated Account Manager',
}

function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount)
}

function featureAvailableForTier(feature: string, tier: PlanTier): boolean {
  const required = PLAN_FEATURES[feature]
  if (!required) return true // Features not in map are available to all
  return (PLAN_HIERARCHY[tier] ?? 0) >= (PLAN_HIERARCHY[required] ?? 0)
}

export default async function BillingPlansPage() {
  const { user } = await requireAuth()

  // Fetch current billing data to determine current plan
  let currentTier: PlanTier = 'free'
  try {
    const data = await getBillingData(user.id)
    currentTier = (data.currentPlan?.tier as PlanTier) ?? 'free'
  } catch {
    // Default to free if billing data unavailable
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight tracking-tight">Plans & Pricing</h1>
        <p className="text-sm text-muted-foreground">
          Compare plans and choose the right one for your school.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const Icon = resolveIcon(plan.icon) ?? Zap
          const isCurrentPlan = currentTier === plan.tier
          const isDowngrade = PLAN_HIERARCHY[currentTier] > PLAN_HIERARCHY[plan.tier]

          return (
            <Card
              key={plan.tier}
              className={`relative forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all ${plan.highlighted ? 'border-primary shadow-lg shadow-primary/10' : ''} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="shadow-md">Most Popular</Badge>
                </div>
              )}
              {isCurrentPlan && !plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="outline" className="shadow-md">Current</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${plan.highlighted ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </div>
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  {plan.monthlyPriceUSD !== null ? (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold tracking-tight">
                          {plan.monthlyPriceUSD === 0 ? 'Free' : formatUSD(plan.monthlyPriceUSD)}
                        </span>
                        {plan.monthlyPriceUSD > 0 && (
                          <span className="text-sm text-muted-foreground">/mo</span>
                        )}
                      </div>
                      {plan.monthlyPriceNGN !== null && plan.monthlyPriceNGN > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ {formatNGN(plan.monthlyPriceNGN)}/mo (NGN)
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="text-3xl font-bold tracking-tight">Custom</span>
                  )}
                </div>

                <Button
                  className="w-full"
                  variant={isCurrentPlan ? 'outline' : plan.highlighted ? 'default' : 'outline'}
                  disabled={isCurrentPlan}
                  asChild={!isCurrentPlan}
                >
                  {isCurrentPlan ? (
                    <span>Current Plan</span>
                  ) : plan.tier === 'enterprise' ? (
                    <Link href="/contact?subject=pricing&plan=enterprise">
                      {plan.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <Link href={`/api/billing/checkout?plan=${plan.tier}&action=${isDowngrade ? 'downgrade' : 'upgrade'}`}>
                      {isDowngrade ? 'Downgrade' : plan.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Currency Note */}
      <p className="text-xs text-muted-foreground text-center">
        Prices shown in USD. Billed in Nigerian Naira (NGN) at current exchange rate. NGN prices shown are approximate.
      </p>

      <Separator />

      {/* Feature Comparison Table */}
      <div>
        <h2 className="text-xl font-semibold mb-6">Feature Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
              <tr className="border-b">
                <th className="text-left py-3 pr-4 font-medium text-muted-foreground w-48">Feature</th>
                {PLANS.map((plan) => (
                  <th key={plan.tier} className={`text-center py-3 px-4 font-medium ${currentTier === plan.tier ? 'text-primary' : 'text-muted-foreground'}`}>
                    {plan.name}
                    {currentTier === plan.tier && (
                      <span className="block text-xs text-primary">(Current)</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_CATEGORIES.map((category) => (
                <>
                  <tr key={`cat-${category.label}`} className="border-b bg-muted/30">
                    <td colSpan={5} className="py-2 px-4 font-semibold text-foreground">
                      {category.label}
                    </td>
                  </tr>
                  {category.features.map((feature) => (
                    <tr key={feature} className="border-b hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 pr-4 text-foreground">
                        {FEATURE_LABELS[feature] ?? feature}
                      </td>
                      {PLANS.map((plan) => {
                        const available = featureAvailableForTier(feature, plan.tier)
                        return (
                          <td key={`${feature}-${plan.tier}`} className="text-center py-2.5 px-4">
                            {available ? (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                            ) : (
                              <X className="h-4 w-4 text-foreground/20 mx-auto" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          All plans include a 14-day free trial. No credit card required.
        </p>
        <Button variant="outline" asChild>
          <Link href="/billing">
            ← Back to Billing
          </Link>
        </Button>
      </div>
    </div>
  )
}
