'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { Check, ArrowRight, Info, Sparkles, Crown, Building2 } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { featureGradientPresets, forgePatternColors } from '@/components/marketing/design-system'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useAnalytics } from '@/hooks/use-analytics'

// ============================================================================
// ExamForge AI — Pricing Section (Premium AI OS)
// ============================================================================
// Three-tier pricing with monthly/yearly toggle, animated gradient border
// glow on the highlighted tier, feature comparison tooltips, "Most Popular"
// badge on Professional, and "Contact Sales" for Enterprise.
// Premium glass cards. Primary border glow for featured. Feature lists
// with checkmarks. CTA buttons: primary for featured, ghost for others.
// ============================================================================

const featureTooltips: Record<string, string> = {
  'Up to 500 students': 'Manage up to 500 active student profiles with full SIS features.',
  'AI question generation (100/month)': 'Generate up to 100 AI-powered questions per month across all subjects.',
  'Unlimited AI question generation': 'No limits on AI question generation. Create as many questions as you need.',
  'CBT exam delivery': 'Full computer-based testing with scheduling, timing, and auto-save.',
  'Auto-marking for objective questions': 'Instant marking for MCQ, true/false, and fill-in-the-blank questions.',
  'AI auto-marking (all question types)': 'AI marks essays and short answers with rubric-based scoring.',
  'Basic analytics dashboard': 'Standard dashboards with class performance and exam results.',
  'Predictive analytics & insights': 'AI-powered predictions for student outcomes and at-risk identification.',
  'Student information system': 'Complete student profiles, enrollment, attendance, and grade tracking.',
  'Live exam monitoring': 'Real-time dashboard showing student progress during active exams.',
  'Full School ERP modules': 'Complete school administration including attendance, timetables, and more.',
  'Billing & payment integration': 'Integrated payments via Flutterwave with invoicing and receipts.',
  'Marketplace access': 'Browse and download exam templates, question banks, and resources.',
  'Parent portal': 'Read-only portal for parents to view their child\'s performance and results.',
  'Priority support': '4-hour response time with live chat support.',
  'Unlimited students & schools': 'No limits on student or school count across your organization.',
  'Multi-school management': 'Manage multiple schools from a single dashboard with centralized policies.',
  'Custom AI model training': 'Train AI models on your specific curriculum and assessment patterns.',
  'Dedicated account manager': 'A named contact who understands your institution\'s needs.',
  'Custom integrations & APIs': 'RESTful APIs and webhooks for custom integrations with your systems.',
  'SLA guarantee (99.9%)': 'Guaranteed uptime with financial penalties for downtime.',
  'Data residency options': 'Choose where your data is stored for compliance with local regulations.',
  'SSO & advanced security': 'Single sign-on integration with SAML 2.0 and OpenID Connect.',
  'Onboarding & training': 'Dedicated training sessions for your staff with custom documentation.',
  '24/7 premium support': 'Round-the-clock support with 1-hour response time SLA.',
  'Email notifications': 'Automated email alerts for exam schedules, results, and announcements.',
  'Standard support': 'Email support with 24-hour response time during business hours.',
}

const USD_TO_NGN = 1500 // Approximate exchange rate

function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

const plans = [
  {
    name: 'Starter',
    description: 'Perfect for individual schools getting started with digital exams and AI-powered tools.',
    monthlyPrice: 49,
    yearlyPrice: 39,
    monthlyPriceNGN: 49 * USD_TO_NGN,
    yearlyPriceNGN: 39 * USD_TO_NGN,
    features: [
      'Up to 500 students',
      'AI question generation (100/month)',
      'CBT exam delivery',
      'Auto-marking for objective questions',
      'Basic analytics dashboard',
      'Student information system',
      'Email notifications',
      'Standard support',
    ],
    cta: 'Start Free Trial',
    ctaHref: '/register',
    planKey: 'starter',
    highlighted: false,
    icon: Sparkles,
  },
  {
    name: 'Professional',
    description: 'For growing schools that need advanced analytics, AI features, and full ERP capabilities.',
    monthlyPrice: 149,
    yearlyPrice: 119,
    monthlyPriceNGN: 149 * USD_TO_NGN,
    yearlyPriceNGN: 119 * USD_TO_NGN,
    features: [
      'Up to 5,000 students',
      'Unlimited AI question generation',
      'AI auto-marking (all question types)',
      'Live exam monitoring',
      'Predictive analytics & insights',
      'Full School ERP modules',
      'Billing & payment integration',
      'Marketplace access',
      'Parent portal',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    ctaHref: '/register',
    planKey: 'professional',
    highlighted: true,
    icon: Crown,
  },
  {
    name: 'Enterprise',
    description: 'For school groups, chains, and educational organizations managing multiple institutions.',
    monthlyPrice: null,
    yearlyPrice: null,
    monthlyPriceNGN: null,
    yearlyPriceNGN: null,
    features: [
      'Unlimited students & schools',
      'All Professional features',
      'Multi-school management',
      'Custom AI model training',
      'Dedicated account manager',
      'Custom integrations & APIs',
      'SLA guarantee (99.9%)',
      'Data residency options',
      'SSO & advanced security',
      'Onboarding & training',
      '24/7 premium support',
    ],
    cta: 'Contact Sales',
    ctaHref: '/contact',
    planKey: 'enterprise',
    highlighted: false,
    icon: Building2,
  },
]

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(true)
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('USD')
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { trackEvent } = useAnalytics()
  const hasTrackedView = useRef(false)

  // Track pricing view on first visibility
  useEffect(() => {
    if (isInView && !hasTrackedView.current) {
      hasTrackedView.current = true
      try { trackEvent('pricing_view', { billing: isYearly ? 'yearly' : 'monthly' }) } catch {}
    }
  }, [isInView, trackEvent, isYearly])

  return (
    <SectionWrapper id="pricing" backgroundClassName="bg-[#090909]">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4"
          >
            Pricing
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground"
          >
            Simple, transparent{' '}
            <GradientText preset="forge">pricing</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Start free for 14 days. No credit card required. Scale as your school grows.
          </motion.p>

          {/* Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            {/* Billing Cycle Toggle */}
            <div className="flex items-center gap-3">
              <span className={cn('text-sm font-medium', !isYearly ? 'text-foreground' : 'text-muted-foreground')}>
                Monthly
              </span>
              <button
                onClick={() => {
                  setIsYearly(!isYearly)
                  try { trackEvent('pricing_view', { billing: !isYearly ? 'yearly' : 'monthly' }) } catch {}
                }}
                className={cn(
                  'relative inline-flex h-7 w-12 items-center rounded-full transition-colors',
                  isYearly ? 'bg-primary shadow-sm shadow-primary/20' : 'bg-white/10'
                )}
                role="switch"
                aria-checked={isYearly}
                aria-label="Toggle yearly pricing"
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-300',
                    isYearly ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
              <span className={cn('text-sm font-medium', isYearly ? 'text-foreground' : 'text-muted-foreground')}>
                Yearly
              </span>
              {isYearly && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="ml-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400"
                >
                  Save 20%
                </motion.span>
              )}
            </div>

            {/* Currency Toggle */}
            <div className="flex items-center gap-2 border-l pl-4 border-white/[0.06]">
              <button
                onClick={() => setCurrency('USD')}
                className={cn(
                  'text-sm font-medium px-2.5 py-1 rounded-md transition-colors',
                  currency === 'USD' ? 'bg-white/[0.06] text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="Show prices in USD"
              >
                USD ($)
              </button>
              <button
                onClick={() => setCurrency('NGN')}
                className={cn(
                  'text-sm font-medium px-2.5 py-1 rounded-md transition-colors',
                  currency === 'NGN' ? 'bg-white/[0.06] text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
                aria-label="Show prices in NGN"
              >
                NGN (₦)
              </button>
            </div>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => {
            const Icon = plan.icon
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + i * 0.1 }}
                className="group relative"
              >
                {/* Animated primary border glow for highlighted plan */}
                {plan.highlighted && (
                  <div className="absolute -inset-px rounded-xl overflow-hidden" aria-hidden="true">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 bg-gradient-to-r from-primary via-cyan-400 to-primary"
                      style={{ transformOrigin: 'center' }}
                    />
                    <div className="absolute inset-px rounded-xl forge-glass-surface" />
                  </div>
                )}

                <div
                  className={cn(
                    'relative rounded-xl border forge-glass-surface p-6 sm:p-8 transition-all duration-300 forge-card-shadow',
                    plan.highlighted
                      ? 'border-transparent shadow-xl shadow-primary/10 scale-[1.02] md:scale-105 forge-glow'
                      : 'border-white/[0.04] hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)]'
                  )}
                >
                  {/* Most Popular badge */}
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-cyan-400 px-4 py-1 text-xs font-bold text-white shadow-lg shadow-primary/30 forge-glow">
                        <Crown className="h-3 w-3" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Plan icon */}
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-4 ${
                    plan.highlighted ? 'bg-primary/10 text-primary' : 'bg-white/[0.04] text-muted-foreground'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    {plan.monthlyPrice !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-bold tracking-tight text-foreground">
                          {currency === 'NGN'
                            ? formatNGN(isYearly ? plan.yearlyPriceNGN! : plan.monthlyPriceNGN!)
                            : `$${isYearly ? plan.yearlyPrice : plan.monthlyPrice}`
                          }
                        </span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold tracking-tight text-foreground">Custom</span>
                      </div>
                    )}
                    {plan.monthlyPrice !== null && isYearly && currency === 'USD' && (
                      <p className="mt-1 text-xs text-foreground/60">
                        Billed annually (${plan.yearlyPrice! * 12}/year)
                      </p>
                    )}
                    {plan.monthlyPrice !== null && isYearly && currency === 'NGN' && (
                      <p className="mt-1 text-xs text-foreground/60">
                        Billed annually ({formatNGN(plan.yearlyPriceNGN! * 12)}/year)
                      </p>
                    )}
                  </div>

                  {/* CTA: primary for featured, ghost for others */}
                  <Button
                    className={cn(
                      'w-full mb-6 font-medium',
                      plan.highlighted
                        ? 'shadow-md shadow-primary/25 forge-glow'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 text-foreground'
                    )}
                    variant={plan.highlighted ? 'default' : 'ghost'}
                    asChild
                  >
                    <Link
                      href={
                        plan.planKey === 'enterprise'
                          ? `/contact?subject=pricing&plan=enterprise`
                          : `/register?plan=${plan.planKey}&billing=${isYearly ? 'yearly' : 'monthly'}`
                      }
                      onClick={() => {
                        try {
                          trackEvent('pricing_select', {
                            plan: plan.planKey,
                            billing: isYearly ? 'yearly' : 'monthly',
                          })
                        } catch {}
                      }}
                    >
                      {plan.cta}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>

                  {/* Feature list with checkmarks */}
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{feature}</span>
                        {featureTooltips[feature] && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="mt-0.5 flex-shrink-0"
                                aria-label={`More info about ${feature}`}
                              >
                                <Info className="h-3 w-3 text-muted-foreground/40 hover:text-primary transition-colors" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[250px]">
                              <p className="text-xs">{featureTooltips[feature]}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-center mt-8 space-y-1"
        >
          <p className="text-sm text-muted-foreground">
            All plans include a 14-day free trial. No credit card required.
          </p>
          {currency === 'USD' && (
            <p className="text-xs text-foreground/60">
              Prices shown in USD. Billed in Nigerian Naira (NGN) at current exchange rate.
            </p>
          )}
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
