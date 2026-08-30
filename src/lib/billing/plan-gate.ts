// ============================================================================
// ExamForge AI — Plan-Based Feature Gating Middleware
// ============================================================================
// Enforces subscription plan tier requirements for feature access.
// Provides:
// 1. requirePlan()  — API route guard that returns 403 if plan is insufficient
// 2. canAccessFeature() — Pure function to check if a plan meets a feature requirement
// 3. enforcePlanLimit() — Checks usage against plan-defined limits
//
// SECURITY PRINCIPLES:
// - Plan checks happen server-side ONLY — client checks are for UX, not security
// - Plan hierarchy is enforced strictly: free < starter < professional < enterprise
// - Organization's active subscription is the source of truth for plan tier
// - Users on expired/downgraded subscriptions lose access immediately
// ============================================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { resolveTenantForAPI } from '@/lib/enterprise/tenant-middleware'
import { createLogger } from '@/lib/observability/logger'
import type { PlanTier } from '@/lib/supabase/types'
import { PLAN_FEATURES, type PlanFeature } from './plan-features'

const log = createLogger('billing:plan-gate')

// ──────────────────────────────────────────────────────────────
// Plan Hierarchy
// ──────────────────────────────────────────────────────────────

/**
 * Plan tier hierarchy — higher number = more permissions.
 * This is the single source of truth for plan ordering.
 */
export const PLAN_HIERARCHY: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: 3,
} as const

/** All valid plan tiers in ascending order */
export const PLAN_TIERS_ASCENDING: PlanTier[] = [
  'free',
  'starter',
  'professional',
  'enterprise',
]

// ──────────────────────────────────────────────────────────────
// canAccessFeature
// ──────────────────────────────────────────────────────────────

/**
 * Pure function to check if a user's plan meets the minimum required plan.
 *
 * @param userPlan - The user's current subscription plan tier
 * @param requiredPlan - The minimum plan tier required
 * @returns true if the user's plan is at or above the required level
 *
 * @example
 * canAccessFeature('professional', 'starter')     // true — professional > starter
 * canAccessFeature('free', 'professional')        // false — free < professional
 * canAccessFeature('enterprise', 'enterprise')    // true — equal
 */
export function canAccessFeature(
  userPlan: PlanTier,
  requiredPlan: PlanTier
): boolean {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan]
}

// ──────────────────────────────────────────────────────────────
// requirePlan
// ──────────────────────────────────────────────────────────────

/**
 * API route guard that checks the authenticated user's organization
 * subscription plan against a minimum required plan.
 *
 * Returns a NextResponse with 403 if the plan is insufficient,
 * or null if access is allowed (caller continues processing).
 *
 * Usage in API routes:
 * ```ts
 * export async function POST(request: NextRequest) {
 *   const denial = await requirePlan('professional', request)
 *   if (denial) return denial  // 403 — plan too low
 *   // ... proceed with handler logic
 * }
 * ```
 *
 * @param minimumPlan - The minimum PlanTier required
 * @param request - The incoming NextRequest (for tenant resolution)
 * @returns NextResponse with 403/401 if denied, or null if allowed
 */
export async function requirePlan(
  minimumPlan: PlanTier,
  request: Request,
  options?: { organizationId?: string | null }
): Promise<NextResponse | null> {
  // ─── Step 1: Authenticate ───────────────────────────────────
  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── Step 2: Resolve tenant ─────────────────────────────────
  // Explicit orgId (derived from the authenticated session by the caller)
  // takes priority — prevents tenant resolution failures for requests
  // without tenant headers/cookies (single-tenant schools).
  let organizationId: string | null = options?.organizationId ?? null
  if (!organizationId) {
    const tenantResult = await resolveTenantForAPI(request as import('next/server').NextRequest)
    if (!tenantResult.ok || !tenantResult.value) {
      return NextResponse.json(
        { error: 'Organization context not found' },
        { status: 400 }
      )
    }
    organizationId = tenantResult.value.organizationId
  }

  // ─── Step 3: Look up organization's active subscription plan ─
  // NOTE: subscriptions↔plans has no FK relationship in the live schema, so
  // the tier is resolved with a second query instead of an embedded join.
  const supabase = await createClient()

  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('plan_id, status')
    .eq('school_id', organizationId)
    .eq('status', 'active')
    .maybeSingle()

  if (subError) {
    log.error('Failed to query subscription for plan gate', subError, { organizationId })
    // Deny on error — fail closed
    return NextResponse.json(
      { error: 'Unable to verify subscription' },
      { status: 500 }
    )
  }

  // If no active subscription, default to 'free' tier
  let userPlan: PlanTier = 'free'
  if (subscription?.plan_id) {
    const { data: plan } = await supabase
      .from('plans')
      .select('tier')
      .eq('id', subscription.plan_id)
      .maybeSingle()
    if (plan?.tier) userPlan = plan.tier as PlanTier
  }

  // ─── Step 4: Check plan hierarchy ───────────────────────────
  if (!canAccessFeature(userPlan, minimumPlan)) {
    log.security('Plan gate denied access', {
      userId: authResult.user.id,
      organizationId,
      userPlan,
      requiredPlan: minimumPlan,
    })

    return NextResponse.json(
      {
        error: 'Plan upgrade required',
        requiredPlan: minimumPlan,
        currentPlan: userPlan,
      },
      { status: 403 }
    )
  }

  // Access allowed — return null
  return null
}

// ──────────────────────────────────────────────────────────────
// requireFeature
// ──────────────────────────────────────────────────────────────

/**
 * API route guard that checks if the user's plan allows a specific feature.
 * Looks up the feature's required plan from PLAN_FEATURES and delegates
 * to requirePlan().
 *
 * Usage:
 * ```ts
 * const denial = await requireFeature('ai_question_generation', request)
 * if (denial) return denial
 * ```
 *
 * @param feature - The feature key from PLAN_FEATURES
 * @param request - The incoming NextRequest
 * @returns NextResponse with 403 if denied, or null if allowed
 */
export async function requireFeature(
  feature: PlanFeature | string,
  request: Request,
  options?: { organizationId?: string | null }
): Promise<NextResponse | null> {
  const requiredPlan = PLAN_FEATURES[feature] ?? 'enterprise' // Default to highest if unknown feature
  return requirePlan(requiredPlan, request, options)
}

// ──────────────────────────────────────────────────────────────
// enforcePlanLimit
// ──────────────────────────────────────────────────────────────

/**
 * Checks whether the current usage exceeds a plan-defined limit.
 *
 * Returns a NextResponse with 403 if the limit is exceeded,
 * or null if usage is within limits.
 *
 * Usage:
 * ```ts
 * const overLimit = enforcePlanLimit('AI credits', currentCredits, planLimits.maxAiCredits)
 * if (overLimit) return overLimit
 * ```
 *
 * @param feature - Human-readable feature name for error messages
 * @param usage - Current usage count
 * @param limit - Maximum allowed usage (0 = unlimited)
 * @returns NextResponse with 403 if over limit, or null if within limits
 */
export function enforcePlanLimit(
  feature: string,
  usage: number,
  limit: number
): NextResponse | null {
  // A limit of 0 means unlimited (enterprise)
  if (limit === 0) return null

  if (usage >= limit) {
    log.info('Plan limit enforced', { feature, usage, limit })

    return NextResponse.json(
      {
        error: `${feature} limit exceeded`,
        feature,
        usage,
        limit,
      },
      { status: 403 }
    )
  }

  return null
}

// ──────────────────────────────────────────────────────────────
// getPlanForOrganization
// ──────────────────────────────────────────────────────────────

/**
 * Resolves the current active plan tier for an organization.
 * Returns 'free' if no active subscription exists.
 *
 * @param organizationId - The organization to check
 * @returns The active PlanTier, or 'free' if no subscription
 */
export async function getPlanForOrganization(
  organizationId: string
): Promise<PlanTier> {
  const supabase = await createClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_tier')
    .eq('org_id', organizationId)
    .eq('status', 'active')
    .maybeSingle()

  return (subscription?.plan_tier as PlanTier) ?? 'free'
}

// ──────────────────────────────────────────────────────────────
// checkFeatureAccess (pure, non-route helper)
// ──────────────────────────────────────────────────────────────

/**
 * Pure function that checks if a given plan tier can access a feature.
 * Looks up the feature's required plan from PLAN_FEATURES.
 *
 * @param userPlan - The user's current plan tier
 * @param feature - The feature to check
 * @returns true if the user's plan allows access to the feature
 */
export function checkFeatureAccess(
  userPlan: PlanTier,
  feature: PlanFeature | string
): boolean {
  const requiredPlan = PLAN_FEATURES[feature] ?? 'enterprise'
  return canAccessFeature(userPlan, requiredPlan)
}
