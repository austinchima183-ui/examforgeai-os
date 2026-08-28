'use client'

import { useState, useEffect, useCallback } from 'react'
import { PLAN_FEATURES } from '@/lib/billing/plan-features'
import type { PlanTier } from '@/lib/supabase/types'

// ============================================================================
// ExamForge AI — Client-Side Feature Gate Hook
// ============================================================================
// Provides client-side feature gating for UI elements (show/hide, upgrade
// prompts). Server-side gates in API routes are the security authority.
// This hook is for UX purposes only — never rely on it for security.
// ============================================================================

interface FeatureGateResult {
  /** Whether the current plan allows access to this feature */
  canAccess: boolean
  /** Whether the subscription check is still loading */
  loading: boolean
  /** The minimum plan tier required for this feature */
  requiredPlan: PlanTier
  /** The user's current plan tier */
  currentPlan: PlanTier
  /** Shows an upgrade prompt toast/dialog if feature isn't available */
  showUpgradePrompt: () => void
}

const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'professional', 'enterprise']

/**
 * Client-side hook to check if the current user's plan allows access
 * to a specific feature. Calls /api/billing/subscriptions to resolve
 * the current plan, then checks against PLAN_FEATURES.
 *
 * NOTE: This is for UX gating only. All security enforcement happens
 * server-side via requireFeature() in API routes.
 *
 * @param featureName - The feature key from PLAN_FEATURES
 * @returns FeatureGateResult with canAccess, loading, requiredPlan, etc.
 *
 * @example
 * const { canAccess, loading, showUpgradePrompt } = useFeatureGate('ai_question_generation')
 * if (!canAccess && !loading) {
 *   return <UpgradePrompt onUpgrade={showUpgradePrompt} />
 * }
 */
export function useFeatureGate(featureName: string): FeatureGateResult {
  const [currentPlan, setCurrentPlan] = useState<PlanTier>('free')
  const [loading, setLoading] = useState(true)

  const requiredPlan = (PLAN_FEATURES[featureName] ?? 'enterprise') as PlanTier

  useEffect(() => {
    let cancelled = false

    async function fetchPlan() {
      try {
        const res = await fetch('/api/billing/subscriptions')
        if (!res.ok) {
          if (!cancelled) {
            setCurrentPlan('free')
            setLoading(false)
          }
          return
        }

        const data = await res.json()
        // The subscription endpoint returns the active subscription plan
        const planTier = (data?.subscription?.plan_tier ?? data?.plan_tier ?? 'free') as PlanTier
        if (!cancelled) {
          setCurrentPlan(planTier)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setCurrentPlan('free')
          setLoading(false)
        }
      }
    }

    fetchPlan()
    return () => { cancelled = true }
  }, [])

  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan)
  const requiredPlanIndex = PLAN_ORDER.indexOf(requiredPlan)
  const canAccess = !loading && currentPlanIndex >= requiredPlanIndex

  const showUpgradePrompt = useCallback(() => {
    // This can be connected to a global upgrade modal/toast
    // For now, dispatch a custom event that the UpgradePrompt component can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('examforge:upgrade-prompt', {
          detail: { feature: featureName, requiredPlan, currentPlan },
        })
      )
    }
  }, [featureName, requiredPlan, currentPlan])

  return {
    canAccess,
    loading,
    requiredPlan,
    currentPlan,
    showUpgradePrompt,
  }
}

/**
 * Utility: Get the display name for a plan tier
 */
export function getPlanDisplayName(plan: PlanTier): string {
  const names: Record<PlanTier, string> = {
    free: 'Free',
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  }
  return names[plan] ?? plan
}

/**
 * Utility: Check if a plan can access a feature (pure, synchronous)
 */
export function canAccessFeatureSync(
  userPlan: PlanTier,
  featureName: string
): boolean {
  const required = (PLAN_FEATURES[featureName] ?? 'enterprise') as PlanTier
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(required)
}
