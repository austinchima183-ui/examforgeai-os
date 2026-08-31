import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse, type NextRequest } from 'next/server'
import { requireApiRole } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { rateLimitError } from '@/lib/api/auth-guard'

// ============================================================================
// ExamForge AI — Plan Catalog Seed (Pricing Tiers)
// ============================================================================
// POST /api/admin/seed-plans   [super_admin only, CSRF-protected]
//
// Seeds the plan catalog that the public pricing page advertises:
//   Starter ($49/mo, $39/mo yearly) · Professional ($149/mo, $119/mo yearly)
//   Enterprise (custom)
// Prices stored in NGN (Flutterwave settlement currency) at ₦1,500/$1.
//
// Idempotent: upserts by (tier, billing_cycle); never duplicates.
// The service-role client bypasses the (broken) plans_all_admin RLS policy —
// see supabase/migrations/006_omega_billing_fix.sql for the policy repair.
// ============================================================================

const USD_TO_NGN = 1500

interface PlanRow {
  name: string
  tier: string
  price: number
  currency: string
  billing_cycle: string
  features: string[]
  max_students: number | null
  max_ai_questions: number | null
  max_exams: number | null
  is_active: boolean
  metadata: Record<string, unknown>
}

const STARTER_FEATURES = [
  'Up to 500 students',
  'AI question generation (100/month)',
  'CBT exam delivery',
  'Auto-marking for objective questions',
  'Basic analytics dashboard',
  'Student information system',
  'Email notifications',
  'Standard support',
]

const PROFESSIONAL_FEATURES = [
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
]

const ENTERPRISE_FEATURES = [
  'Unlimited students & schools',
  'SSO / SAML authentication',
  'Dedicated success manager',
  'Custom integrations',
  '99.9% uptime SLA',
  '24/7 priority support',
]

function buildPlanCatalog(): PlanRow[] {
  return [
    {
      name: 'Starter (Monthly)', tier: 'starter', price: 49 * USD_TO_NGN, currency: 'NGN', billing_cycle: 'monthly',
      features: STARTER_FEATURES, max_students: 500, max_ai_questions: 100, max_exams: 50, is_active: true,
      metadata: { display_name: 'Starter', usd_monthly: 49, sort_order: 1 },
    },
    {
      name: 'Starter (Yearly)', tier: 'starter', price: 39 * USD_TO_NGN * 12, currency: 'NGN', billing_cycle: 'yearly',
      features: STARTER_FEATURES, max_students: 500, max_ai_questions: 100, max_exams: 50, is_active: true,
      metadata: { display_name: 'Starter', usd_yearly_per_month: 39, sort_order: 1 },
    },
    {
      name: 'Professional (Monthly)', tier: 'professional', price: 149 * USD_TO_NGN, currency: 'NGN', billing_cycle: 'monthly',
      features: PROFESSIONAL_FEATURES, max_students: 5000, max_ai_questions: 100000, max_exams: 1000, is_active: true,
      metadata: { display_name: 'Professional', usd_monthly: 149, sort_order: 2 },
    },
    {
      name: 'Professional (Yearly)', tier: 'professional', price: 119 * USD_TO_NGN * 12, currency: 'NGN', billing_cycle: 'yearly',
      features: PROFESSIONAL_FEATURES, max_students: 5000, max_ai_questions: 100000, max_exams: 1000, is_active: true,
      metadata: { display_name: 'Professional', usd_yearly_per_month: 119, sort_order: 2 },
    },
    {
      name: 'Enterprise (Custom)', tier: 'enterprise', price: 0, currency: 'NGN', billing_cycle: 'monthly',
      features: ENTERPRISE_FEATURES, max_students: null, max_ai_questions: null, max_exams: null, is_active: true,
      metadata: { display_name: 'Enterprise', custom_pricing: true, sort_order: 3 },
    },
  ]
}

export async function POST(request: NextRequest) {
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.standard)
  if (!allowed) return rateLimitError(retryAfter)

  const auth = await requireApiRole(request, ['super_admin'])
  if (auth instanceof NextResponse) return auth

  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    const catalog = buildPlanCatalog()

    // Read existing plans (service client bypasses RLS)
    const { data: existing, error: readError } = await supabase
      .from('plans')
      .select('id, tier, billing_cycle, is_active')

    if (readError) {
      return NextResponse.json({ error: 'Failed to read plans', detail: readError.message }, { status: 500 })
    }

    const existingKeys = new Set(
      (existing ?? []).map(p => `${p.tier}:${p.billing_cycle}`)
    )

    const toInsert = catalog.filter(p => !existingKeys.has(`${p.tier}:${p.billing_cycle}`))

    if (toInsert.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Plan catalog already complete',
        plans: (existing ?? []).length,
        inserted: 0,
      })
    }

    const { data: inserted, error: insertError } = await supabase
      .from('plans')
      .insert(toInsert)
      .select('id, name, tier, billing_cycle, price, currency')

    if (insertError) {
      return NextResponse.json({ error: 'Failed to seed plans', detail: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${inserted?.length ?? 0} plan rows`,
      inserted: inserted ?? [],
      total: (existing ?? []).length + (inserted?.length ?? 0),
    })
  } catch (error) {
    console.error('Seed plans error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireApiRole(request, ['super_admin'])
  if (auth instanceof NextResponse) return auth

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  const { data, error } = await supabase
    .from('plans')
    .select('id, name, tier, billing_cycle, price, currency, is_active')
    .order('tier', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to read plans', detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: data?.length ?? 0, plans: data ?? [] })
}
