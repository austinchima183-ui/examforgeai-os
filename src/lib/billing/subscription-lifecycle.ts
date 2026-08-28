// ============================================================================
// ExamForge AI — Subscription Lifecycle Management
// ============================================================================
// Complete subscription lifecycle: creation, activation, renewal, cancellation,
// plan changes (upgrade/downgrade), pause/resume, and past-due handling.
//
// CRITICAL SECURITY PRINCIPLE:
// NEVER grant access before verified payment. Subscriptions are created in
// 'pending' state and can only be 'activated' after the payment provider
// confirms the payment. This is enforced at every state transition.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import { recordAuditEntry } from './payment-audit'
import type { Subscription, ProrationResult } from './types'
import type { PaymentProvider, SubscriptionLifecycleResult } from './types-extended'
import { PAST_DUE_GRACE_PERIOD_MS } from './types-extended'
import type { PlanTier, BillingModel } from '@/lib/supabase/types'

const log = createLogger('billing:subscription-lifecycle')

// ──────────────────────────────────────────────────────────────
// createSubscription
// ──────────────────────────────────────────────────────────────

/**
 * Creates a new subscription in 'pending' state.
 *
 * The subscription will NOT be active until activateSubscription() is called
 * with a verified payment reference. This enforces Security Principle 1:
 * NEVER grant access before verified payment.
 *
 * @param userId - The user ID creating the subscription
 * @param planId - The plan ID
 * @param billingCycle - The billing cycle ('monthly' | 'quarterly' | 'annual' | 'biennial' | 'lifetime')
 * @param provider - The payment provider
 * @returns SubscriptionLifecycleResult
 */
export async function createSubscription(
  userId: string,
  planId: string,
  billingCycle: string,
  provider: PaymentProvider
): Promise<SubscriptionLifecycleResult> {
  try {
    const supabase = await createClient()

    // Get user's organization (users table scopes by school_id)
    const { data: profile } = await supabase
      .from('users')
      .select('school_id')
      .eq('id', userId)
      .maybeSingle()

    const orgId = (profile?.school_id ?? '') as string

    if (!orgId) {
      return { success: false, error: 'User has no organization' }
    }

    // Get plan details — live schema: one price per (tier, billing_cycle) row
    const { data: plan } = await supabase
      .from('plans')
      .select('tier, price, billing_cycle, currency')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle()

    if (!plan) {
      return { success: false, error: 'Plan not found or inactive' }
    }

    // If the requested cycle differs from the plan row's cycle, find the matching row
    let planPrice = (plan.price as number) ?? 0
    let planCurrency = (plan.currency as string) ?? 'NGN'
    if ((plan.billing_cycle as string) !== billingCycle) {
      const { data: cyclePlan } = await supabase
        .from('plans')
        .select('price, currency')
        .eq('tier', plan.tier)
        .eq('billing_cycle', billingCycle)
        .eq('is_active', true)
        .maybeSingle()
      if (cyclePlan) {
        planPrice = (cyclePlan.price as number) ?? planPrice
        planCurrency = (cyclePlan.currency as string) ?? planCurrency
      }
    }

    // Calculate period dates
    const periodDates = calculatePeriodDates(billingCycle)
    const amount = getPlanPrice(plan, billingCycle)

    // Create subscription in 'pending' state — NOT active until payment is verified
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        school_id: orgId,
        user_id: userId,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: 'pending', // CRITICAL: Not 'active' until payment verified
        seats_purchased: 1,
        price_at_subscription: planPrice,
        currency: planCurrency,
        current_period_start: periodDates.start,
        current_period_end: periodDates.end,
      })
      .select('*')
      .single()

    if (error || !subscription) {
      log.error('Failed to create subscription', error, { userId, planId })
      return { success: false, error: 'Failed to create subscription' }
    }

    await recordAuditEntry(
      subscription.id,
      'subscription.created',
      provider,
      { planId, billingCycle, amount, status: 'pending' },
      userId
    )

    log.info('Subscription created in pending state', { subscriptionId: subscription.id, planId })

    return {
      success: true,
      subscription: mapSubscriptionFromDb(subscription),
    }
  } catch (error) {
    log.error('createSubscription error', error, { userId, planId })
    return { success: false, error: 'Failed to create subscription' }
  }
}

// ──────────────────────────────────────────────────────────────
// activateSubscription
// ──────────────────────────────────────────────────────────────

/**
 * Activates a pending subscription after payment verification.
 *
 * This is the ONLY way to move a subscription from 'pending' to 'active'.
 * The paymentReference MUST be from a verified payment — the caller is
 * responsible for verifying the payment before calling this function.
 *
 * SECURITY: Never call this without first verifying the payment with the provider.
 *
 * @param subscriptionId - The subscription ID to activate
 * @param paymentReference - The verified payment reference
 * @returns SubscriptionLifecycleResult
 */
export async function activateSubscription(
  subscriptionId: string,
  paymentReference: string
): Promise<SubscriptionLifecycleResult> {
  try {
    const supabase = await createClient()

    // Get the subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!sub) {
      return { success: false, error: 'Subscription not found' }
    }

    // Only pending subscriptions can be activated
    if (sub.status !== 'pending') {
      return { success: false, error: `Cannot activate subscription in '${sub.status}' state` }
    }

    // Activate the subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
        payment_reference: paymentReference,
      })
      .eq('id', subscriptionId)

    if (error) {
      log.error('Failed to activate subscription', error, { subscriptionId })
      return { success: false, error: 'Failed to activate subscription' }
    }

    const provider = (sub.provider as PaymentProvider) ?? 'flutterwave'

    await recordAuditEntry(
      subscriptionId,
      'subscription.activated',
      provider,
      { paymentReference, previousStatus: sub.status },
    )

    log.info('Subscription activated', { subscriptionId, paymentReference })

    return { success: true }
  } catch (error) {
    log.error('activateSubscription error', error, { subscriptionId })
    return { success: false, error: 'Failed to activate subscription' }
  }
}

// ──────────────────────────────────────────────────────────────
// renewSubscription
// ──────────────────────────────────────────────────────────────

/**
 * Renews a subscription for the next billing period.
 *
 * Used for automatic renewal when a subscription period ends.
 * The subscription must be in 'active' state to be renewed.
 *
 * @param subscriptionId - The subscription ID to renew
 * @returns SubscriptionLifecycleResult
 */
export async function renewSubscription(
  subscriptionId: string
): Promise<SubscriptionLifecycleResult> {
  try {
    const supabase = await createClient()

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!sub) {
      return { success: false, error: 'Subscription not found' }
    }

    if (sub.status !== 'active') {
      return { success: false, error: `Cannot renew subscription in '${sub.status}' state` }
    }

    // Calculate next period dates
    const currentEnd = new Date(sub.current_period_end as string)
    const billingCycle = sub.billing_cycle as string
    const nextPeriod = calculatePeriodDates(billingCycle, currentEnd)

    const { error } = await supabase
      .from('subscriptions')
      .update({
        current_period_start: nextPeriod.start,
        current_period_end: nextPeriod.end,
        renewed_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)

    if (error) {
      log.error('Failed to renew subscription', error, { subscriptionId })
      return { success: false, error: 'Failed to renew subscription' }
    }

    const provider = (sub.provider as PaymentProvider) ?? 'flutterwave'

    await recordAuditEntry(subscriptionId, 'subscription.renewed', provider, {
      periodStart: nextPeriod.start,
      periodEnd: nextPeriod.end,
    })

    log.info('Subscription renewed', { subscriptionId })

    return { success: true }
  } catch (error) {
    log.error('renewSubscription error', error, { subscriptionId })
    return { success: false, error: 'Failed to renew subscription' }
  }
}

// ──────────────────────────────────────────────────────────────
// cancelSubscription
// ──────────────────────────────────────────────────────────────

/**
 * Cancels a subscription.
 *
 * If immediate is true, the subscription is cancelled right away.
 * Otherwise, it's marked to cancel at the end of the current period.
 *
 * @param subscriptionId - The subscription ID to cancel
 * @param reason - The reason for cancellation
 * @param immediate - Whether to cancel immediately (default: false)
 * @returns SubscriptionLifecycleResult
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason: string,
  immediate: boolean = false
): Promise<SubscriptionLifecycleResult> {
  try {
    const supabase = await createClient()

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!sub) {
      return { success: false, error: 'Subscription not found' }
    }

    if (sub.status === 'cancelled') {
      return { success: false, error: 'Subscription is already cancelled' }
    }

    const updateData: Record<string, unknown> = {
      cancelled_reason: reason,
      cancelled_at: new Date().toISOString(),
    }

    if (immediate) {
      updateData.status = 'cancelled'
    } else {
      updateData.cancel_at_period_end = true
    }

    const { error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)

    if (error) {
      log.error('Failed to cancel subscription', error, { subscriptionId })
      return { success: false, error: 'Failed to cancel subscription' }
    }

    const provider = (sub.provider as PaymentProvider) ?? 'flutterwave'

    await recordAuditEntry(subscriptionId, 'subscription.cancelled', provider, {
      reason,
      immediate,
      previousStatus: sub.status,
    })

    log.info('Subscription cancelled', { subscriptionId, immediate, reason })

    return { success: true }
  } catch (error) {
    log.error('cancelSubscription error', error, { subscriptionId })
    return { success: false, error: 'Failed to cancel subscription' }
  }
}

// ──────────────────────────────────────────────────────────────
// upgradeSubscription
// ──────────────────────────────────────────────────────────────

/**
 * Upgrades a subscription to a higher plan.
 *
 * Calculates proration credit for the remaining period on the current plan
 * and applies the new plan rate immediately.
 *
 * @param subscriptionId - The subscription ID to upgrade
 * @param newPlanId - The new plan ID (must be higher tier)
 * @returns SubscriptionLifecycleResult with proration details
 */
export async function upgradeSubscription(
  subscriptionId: string,
  newPlanId: string
): Promise<SubscriptionLifecycleResult> {
  try {
    const supabase = await createClient()

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!sub) {
      return { success: false, error: 'Subscription not found' }
    }

    if (sub.status !== 'active') {
      return { success: false, error: 'Only active subscriptions can be upgraded' }
    }

    // Get new plan details
    const { data: newPlan } = await supabase
      .from('plans')
      .select('tier, monthly_price, quarterly_price, annual_price, biennial_price, lifetime_price')
      .eq('id', newPlanId)
      .eq('is_active', true)
      .maybeSingle()

    if (!newPlan) {
      return { success: false, error: 'New plan not found or inactive' }
    }

    // Calculate proration
    const proration = calculateProration(
      sub.amount as number,
      new Date(sub.current_period_start as string),
      new Date(sub.current_period_end as string),
      getPlanPrice(newPlan, sub.billing_cycle as string)
    )

    // Update subscription
    const { error } = await supabase
      .from('subscriptions')
      .update({
        plan_id: newPlanId,
        plan_tier: newPlan.tier as PlanTier,
        amount: proration.debitAmount,
        upgraded_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)

    if (error) {
      log.error('Failed to upgrade subscription', error, { subscriptionId, newPlanId })
      return { success: false, error: 'Failed to upgrade subscription' }
    }

    const provider = (sub.provider as PaymentProvider) ?? 'flutterwave'

    await recordAuditEntry(subscriptionId, 'subscription.upgraded', provider, {
      previousPlanId: sub.plan_id,
      newPlanId,
      proration,
    })

    log.info('Subscription upgraded', { subscriptionId, newPlanId })

    return { success: true, proration }
  } catch (error) {
    log.error('upgradeSubscription error', error, { subscriptionId })
    return { success: false, error: 'Failed to upgrade subscription' }
  }
}

// ──────────────────────────────────────────────────────────────
// downgradeSubscription
// ──────────────────────────────────────────────────────────────

/**
 * Downgrades a subscription to a lower plan.
 *
 * Downgrades take effect at the end of the current billing period
 * to ensure the user gets what they've paid for.
 *
 * @param subscriptionId - The subscription ID to downgrade
 * @param newPlanId - The new plan ID (must be lower tier)
 * @returns SubscriptionLifecycleResult with proration details
 */
export async function downgradeSubscription(
  subscriptionId: string,
  newPlanId: string
): Promise<SubscriptionLifecycleResult> {
  try {
    const supabase = await createClient()

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!sub) {
      return { success: false, error: 'Subscription not found' }
    }

    if (sub.status !== 'active') {
      return { success: false, error: 'Only active subscriptions can be downgraded' }
    }

    // Get new plan details
    const { data: newPlan } = await supabase
      .from('plans')
      .select('tier, monthly_price, quarterly_price, annual_price, biennial_price, lifetime_price')
      .eq('id', newPlanId)
      .eq('is_active', true)
      .maybeSingle()

    if (!newPlan) {
      return { success: false, error: 'New plan not found or inactive' }
    }

    // Calculate proration (credit for remaining period)
    const proration = calculateProration(
      sub.amount as number,
      new Date(sub.current_period_start as string),
      new Date(sub.current_period_end as string),
      getPlanPrice(newPlan, sub.billing_cycle as string)
    )

    // Mark for downgrade at period end
    const { error } = await supabase
      .from('subscriptions')
      .update({
        pending_plan_id: newPlanId,
        pending_plan_tier: newPlan.tier as PlanTier,
        downgrade_at_period_end: true,
        downgraded_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)

    if (error) {
      log.error('Failed to downgrade subscription', error, { subscriptionId, newPlanId })
      return { success: false, error: 'Failed to downgrade subscription' }
    }

    const provider = (sub.provider as PaymentProvider) ?? 'flutterwave'

    await recordAuditEntry(subscriptionId, 'subscription.downgraded', provider, {
      previousPlanId: sub.plan_id,
      newPlanId,
      effectiveAt: sub.current_period_end,
      proration,
    })

    log.info('Subscription marked for downgrade at period end', { subscriptionId, newPlanId })

    return { success: true, proration }
  } catch (error) {
    log.error('downgradeSubscription error', error, { subscriptionId })
    return { success: false, error: 'Failed to downgrade subscription' }
  }
}

// ──────────────────────────────────────────────────────────────
// pauseSubscription
// ──────────────────────────────────────────────────────────────

/**
 * Pauses an active subscription.
 *
 * While paused, the user retains access but no billing occurs.
 * The subscription can be resumed later.
 *
 * @param subscriptionId - The subscription ID to pause
 * @param reason - The reason for pausing
 * @returns SubscriptionLifecycleResult
 */
export async function pauseSubscription(
  subscriptionId: string,
  reason: string
): Promise<SubscriptionLifecycleResult> {
  try {
    const supabase = await createClient()

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!sub) {
      return { success: false, error: 'Subscription not found' }
    }

    if (sub.status !== 'active') {
      return { success: false, error: `Cannot pause subscription in '${sub.status}' state` }
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        pause_reason: reason,
      })
      .eq('id', subscriptionId)

    if (error) {
      log.error('Failed to pause subscription', error, { subscriptionId })
      return { success: false, error: 'Failed to pause subscription' }
    }

    const provider = (sub.provider as PaymentProvider) ?? 'flutterwave'

    await recordAuditEntry(subscriptionId, 'subscription.paused', provider, { reason })

    log.info('Subscription paused', { subscriptionId, reason })

    return { success: true }
  } catch (error) {
    log.error('pauseSubscription error', error, { subscriptionId })
    return { success: false, error: 'Failed to pause subscription' }
  }
}

// ──────────────────────────────────────────────────────────────
// resumeSubscription
// ──────────────────────────────────────────────────────────────

/**
 * Resumes a paused subscription.
 *
 * @param subscriptionId - The subscription ID to resume
 * @returns SubscriptionLifecycleResult
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<SubscriptionLifecycleResult> {
  try {
    const supabase = await createClient()

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!sub) {
      return { success: false, error: 'Subscription not found' }
    }

    if (sub.status !== 'paused') {
      return { success: false, error: `Cannot resume subscription in '${sub.status}' state` }
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        resumed_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)

    if (error) {
      log.error('Failed to resume subscription', error, { subscriptionId })
      return { success: false, error: 'Failed to resume subscription' }
    }

    const provider = (sub.provider as PaymentProvider) ?? 'flutterwave'

    await recordAuditEntry(subscriptionId, 'subscription.resumed', provider, {})

    log.info('Subscription resumed', { subscriptionId })

    return { success: true }
  } catch (error) {
    log.error('resumeSubscription error', error, { subscriptionId })
    return { success: false, error: 'Failed to resume subscription' }
  }
}

// ──────────────────────────────────────────────────────────────
// handlePastDue
// ──────────────────────────────────────────────────────────────

/**
 * Handles a past-due subscription.
 *
 * Applies grace period logic:
 * - If within grace period (7 days): subscription stays 'past_due', user has limited access
 * - If beyond grace period: subscription is suspended
 *
 * @param subscriptionId - The subscription ID with past-due status
 * @returns SubscriptionLifecycleResult
 */
export async function handlePastDue(
  subscriptionId: string
): Promise<SubscriptionLifecycleResult> {
  try {
    const supabase = await createClient()

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .maybeSingle()

    if (!sub) {
      return { success: false, error: 'Subscription not found' }
    }

    if (sub.status !== 'past_due') {
      return { success: false, error: `Subscription is not past_due (current: '${sub.status}')` }
    }

    // Check if we're within the grace period
    const periodEnd = new Date(sub.current_period_end as string)
    const now = new Date()
    const timeSinceDue = now.getTime() - periodEnd.getTime()

    const provider = (sub.provider as PaymentProvider) ?? 'flutterwave'

    if (timeSinceDue > PAST_DUE_GRACE_PERIOD_MS) {
      // Beyond grace period — suspend subscription
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'suspended',
          suspended_at: new Date().toISOString(),
          suspended_reason: 'Past due beyond grace period',
        })
        .eq('id', subscriptionId)

      if (error) {
        log.error('Failed to suspend past-due subscription', error, { subscriptionId })
        return { success: false, error: 'Failed to suspend subscription' }
      }

      await recordAuditEntry(subscriptionId, 'subscription.suspended', provider, {
        reason: 'past_due_grace_period_exceeded',
        gracePeriodMs: PAST_DUE_GRACE_PERIOD_MS,
      })

      log.info('Past-due subscription suspended (grace period exceeded)', { subscriptionId })

      return { success: true }
    }

    // Within grace period — keep as past_due
    await recordAuditEntry(subscriptionId, 'subscription.past_due', provider, {
      gracePeriodRemainingMs: PAST_DUE_GRACE_PERIOD_MS - timeSinceDue,
    })

    log.info('Subscription in grace period', {
      subscriptionId,
      remainingDays: Math.ceil((PAST_DUE_GRACE_PERIOD_MS - timeSinceDue) / (24 * 60 * 60 * 1000)),
    })

    return { success: true }
  } catch (error) {
    log.error('handlePastDue error', error, { subscriptionId })
    return { success: false, error: 'Failed to handle past-due subscription' }
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function calculatePeriodDates(
  billingCycle: string,
  startDate: Date = new Date()
): { start: string; end: string } {
  const start = new Date(startDate)
  const end = new Date(startDate)

  switch (billingCycle) {
    case 'monthly':
      end.setMonth(end.getMonth() + 1)
      break
    case 'quarterly':
      end.setMonth(end.getMonth() + 3)
      break
    case 'annual':
      end.setFullYear(end.getFullYear() + 1)
      break
    case 'biennial':
      end.setFullYear(end.getFullYear() + 2)
      break
    case 'lifetime':
      end.setFullYear(end.getFullYear() + 100) // Effectively lifetime
      break
    default:
      end.setMonth(end.getMonth() + 1)
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

function getPlanPrice(plan: Record<string, unknown>, billingCycle: string): number {
  // Live schema: plans store ONE price per row, keyed by (tier, billing_cycle)
  const price = plan.price as number | undefined
  if (price !== undefined && price !== null) return price
  return 0
}

function calculateProration(
  currentAmount: number,
  periodStart: Date,
  periodEnd: Date,
  newAmount: number
): ProrationResult {
  const now = new Date()
  const totalDays = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)))
  const remainingDays = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  // Credit for unused portion of current plan
  const creditAmount = (currentAmount / totalDays) * remainingDays

  // Debit for new plan for remaining period
  const debitAmount = (newAmount / totalDays) * remainingDays

  return {
    creditAmount: Math.round(creditAmount * 100) / 100,
    debitAmount: Math.round(debitAmount * 100) / 100,
    netAmount: Math.round((debitAmount - creditAmount) * 100) / 100,
    remainingDays,
    totalDaysInPeriod: totalDays,
    creditDescription: `Credit for ${remainingDays}/${totalDays} days remaining on current plan`,
    debitDescription: `Charge for ${remainingDays}/${totalDays} days on new plan`,
  }
}

function mapSubscriptionFromDb(data: Record<string, unknown>): Subscription {
  return {
    id: data.id as string,
    orgId: (data.org_id as string) ?? '',
    userId: (data.user_id as string) ?? '',
    planId: (data.plan_id as string) ?? '',
    planTier: data.plan_tier as PlanTier,
    billingCycle: (data.billing_cycle as Subscription['billingCycle']) ?? 'monthly',
    billingModel: data.billing_model as BillingModel,
    status: (data.status as string) ?? 'pending',
    seats: (data.seats as number) ?? 1,
    currentPeriodStart: (data.current_period_start as string) ?? '',
    currentPeriodEnd: (data.current_period_end as string) ?? '',
    cancelAtPeriodEnd: (data.cancel_at_period_end as boolean) ?? false,
    cancelledAt: (data.cancelled_at as string) ?? null,
    cancelledReason: (data.cancelled_reason as string) ?? null,
    couponId: (data.coupon_id as string) ?? null,
    trialStart: (data.trial_start as string) ?? null,
    trialEnd: (data.trial_end as string) ?? null,
    createdAt: (data.created_at as string) ?? '',
    updatedAt: (data.updated_at as string) ?? '',
  }
}
