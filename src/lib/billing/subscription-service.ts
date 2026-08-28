// ============================================================================
// ExamForge AI — Subscription Management Service
// ============================================================================
// Handles subscription lifecycle: creation, updates, cancellation, plan changes,
// seat management, and day-based proration calculations.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  Subscription,
  PricingTier,
  SeatAllocation,
  MeteredUsage,
  ProrationResult,
  OrganizationBillingOverview,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  Invoice,
  BillingCycle,
} from './types'
import type { PlanTier, BillingModel } from '@/lib/supabase/types'

// ──────────────────────────────────────────────────────────────
// Plan Price Resolution
// ──────────────────────────────────────────────────────────────

function getPlanPriceForCycle(plan: PricingTier, cycle: BillingCycle): number {
  switch (cycle) {
    case 'monthly':
      return plan.monthlyPrice
    case 'quarterly':
      return plan.quarterlyPrice
    case 'annual':
      return plan.annualPrice
    case 'biennial':
      return plan.biennialPrice
    case 'lifetime':
      return plan.lifetimePrice ?? 0
    default:
      return plan.monthlyPrice
  }
}

// ──────────────────────────────────────────────────────────────
// Period Date Calculation
// ──────────────────────────────────────────────────────────────

function calculatePeriodDates(cycle: BillingCycle, startDate: Date = new Date()): { start: string; end: string } {
  const start = new Date(startDate)
  const end = new Date(startDate)

  switch (cycle) {
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
      end.setFullYear(end.getFullYear() + 100)
      break
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

// ──────────────────────────────────────────────────────────────
// Resolve Plan from DB
// ──────────────────────────────────────────────────────────────

async function resolvePlan(planTier: PlanTier): Promise<PricingTier | null> {
  const supabase = await createClient()
  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('tier', planTier)
    .eq('is_active', true)
    .maybeSingle()

  if (!plan) return null

  return {
    id: plan.id,
    name: plan.name ?? '',
    tier: plan.tier as PlanTier,
    billingModel: 'teacher_saas',
    description: plan.description ?? '',
    monthlyPrice: plan.price ?? 0,
    quarterlyPrice: plan.price ?? 0,
    annualPrice: plan.price ?? 0,
    biennialPrice: plan.price ?? 0,
    lifetimePrice: null,
    currency: plan.currency ?? 'NGN',
    features: plan.features ?? [],
    limits: {
      maxStudents: plan.max_students ?? 50,
      maxAiCredits: plan.max_ai_credits ?? 100,
      maxApiCalls: plan.max_api_calls ?? 1000,
      maxStorageGb: plan.max_storage_gb ?? 1,
      maxExamSessions: plan.max_exam_sessions ?? 10,
      maxTeachers: plan.max_teachers ?? 5,
      maxSchools: plan.max_schools ?? 1,
      maxSeats: plan.max_seats ?? 10,
      customBranding: plan.custom_branding ?? false,
      prioritySupport: plan.priority_support ?? false,
      dedicatedAccountManager: plan.dedicated_account_manager ?? false,
      ssoEnabled: plan.sso_enabled ?? false,
      auditLogRetentionDays: plan.audit_log_retention_days ?? 30,
    },
    popular: plan.popular ?? false,
  }
}

// ──────────────────────────────────────────────────────────────
// createSubscription
// ──────────────────────────────────────────────────────────────

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<Subscription> {
  const supabase = await createClient()
  const plan = await resolvePlan(input.plan)

  if (!plan) {
    throw new Error(`Plan not found: ${input.plan}`)
  }

  const periodDates = calculatePeriodDates(input.billingCycle)
  const price = getPlanPriceForCycle(plan, input.billingCycle)

  // Apply coupon if provided
  let couponId: string | null = null
  if (input.couponCode) {
    const { data: coupon } = await supabase
      .from('coupons')
      .select('id, type, value, applicable_plans, is_active, valid_from, valid_until, max_uses, used_count')
      .eq('code', input.couponCode)
      .maybeSingle()

    if (coupon && coupon.is_active) {
      const now = new Date().toISOString()
      const isValidDate = (!coupon.valid_until || coupon.valid_until >= now) && coupon.valid_from <= now
      const isWithinUses = !coupon.max_uses || coupon.used_count < coupon.max_uses
      const isApplicablePlan = (coupon.applicable_plans as PlanTier[]).includes(input.plan)

      if (isValidDate && isWithinUses && isApplicablePlan) {
        couponId = coupon.id

        // Increment coupon usage
        await supabase
          .from('coupons')
          .update({ used_count: coupon.used_count + 1 })
          .eq('id', coupon.id)
      }
    }
  }

  // Calculate seat overage cost
  const seatOverage = Math.max(0, input.seats - plan.limits.maxSeats)
  const seatOverageCost = seatOverage * (plan.limits.maxSeats > 0 ? price / plan.limits.maxSeats : 0)

  const totalAmount = price + seatOverageCost

  // Insert subscription (live schema: school-scoped, no plan_tier/billing_model/seats columns)
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .insert({
      school_id: input.orgId,
      user_id: null,
      plan_id: plan.id,
      billing_cycle: input.billingCycle,
      status: 'active',
      seats_purchased: input.seats,
      seats_used: 0,
      current_period_start: periodDates.start,
      current_period_end: periodDates.end,
      cancel_at_period_end: false,
      coupon_id: couponId,
      price_at_subscription: totalAmount,
      currency: plan.currency,
    })
    .select('id, school_id, user_id, plan_id, billing_cycle, status, seats_purchased, current_period_start, current_period_end, cancel_at_period_end, cancelled_at, cancelled_reason, coupon_id, trial_start, trial_end, created_at, updated_at')
    .single()

  if (error || !subscription) {
    throw new Error(`Failed to create subscription: ${error?.message ?? 'Unknown error'}`)
  }

  // Update seat allocation
  await supabase
    .from('seat_allocations')
    .upsert({
      org_id: input.orgId,
      plan_id: plan.id,
      total_seats: input.seats,
      used_seats: 0,
      available_seats: input.seats,
      seat_price: plan.limits.maxSeats > 0 ? price / plan.limits.maxSeats : 0,
      currency: plan.currency,
    }, { onConflict: 'org_id,plan_id' })

  return {
    id: subscription.id,
    orgId: subscription.school_id ?? input.orgId,
    userId: subscription.user_id ?? '',
    planId: subscription.plan_id ?? plan.id,
    planTier: input.plan,
    billingCycle: (subscription.billing_cycle as BillingCycle) ?? input.billingCycle,
    billingModel: plan.billingModel,
    status: subscription.status ?? 'active',
    seats: subscription.seats_purchased ?? input.seats,
    currentPeriodStart: subscription.current_period_start ?? periodDates.start,
    currentPeriodEnd: subscription.current_period_end ?? periodDates.end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    cancelledAt: subscription.cancelled_at ?? null,
    cancelledReason: subscription.cancelled_reason ?? null,
    couponId: subscription.coupon_id ?? couponId,
    trialStart: subscription.trial_start ?? null,
    trialEnd: subscription.trial_end ?? null,
    createdAt: subscription.created_at ?? new Date().toISOString(),
    updatedAt: subscription.updated_at ?? new Date().toISOString(),
  }
}

// ──────────────────────────────────────────────────────────────
// getSubscription
// ──────────────────────────────────────────────────────────────

export async function getSubscription(id: string): Promise<Subscription | null> {
  const supabase = await createClient()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!sub) return null

  return {
    id: sub.id,
    orgId: sub.org_id ?? '',
    userId: sub.user_id ?? '',
    planId: sub.plan_id ?? '',
    planTier: sub.plan_tier as PlanTier,
    billingCycle: sub.billing_cycle as BillingCycle,
    billingModel: sub.billing_model as BillingModel,
    status: sub.status ?? 'active',
    seats: sub.seats ?? 1,
    currentPeriodStart: sub.current_period_start ?? '',
    currentPeriodEnd: sub.current_period_end ?? '',
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    cancelledAt: sub.cancelled_at ?? null,
    cancelledReason: sub.cancelled_reason ?? null,
    couponId: sub.coupon_id ?? null,
    trialStart: sub.trial_start ?? null,
    trialEnd: sub.trial_end ?? null,
    createdAt: sub.created_at ?? '',
    updatedAt: sub.updated_at ?? '',
  }
}

// ──────────────────────────────────────────────────────────────
// updateSubscription
// ──────────────────────────────────────────────────────────────

export async function updateSubscription(
  id: string,
  changes: UpdateSubscriptionInput
): Promise<Subscription> {
  const supabase = await createClient()
  const current = await getSubscription(id)

  if (!current) {
    throw new Error(`Subscription not found: ${id}`)
  }

  const updates: Record<string, unknown> = {}

  if (changes.plan && changes.plan !== current.planTier) {
    const newPlan = await resolvePlan(changes.plan)
    if (!newPlan) throw new Error(`Plan not found: ${changes.plan}`)

    const proration = calculateProration(
      current.planTier,
      changes.plan,
      new Date(current.currentPeriodStart),
      new Date()
    )

    updates.plan_tier = changes.plan
    updates.plan_id = newPlan.id
    updates.billing_model = newPlan.billingModel
    updates.amount = proration.netAmount > 0
      ? proration.debitAmount
      : proration.creditAmount
  }

  if (changes.billingCycle && changes.billingCycle !== current.billingCycle) {
    updates.billing_cycle = changes.billingCycle
    const periodDates = calculatePeriodDates(changes.billingCycle)
    updates.current_period_start = periodDates.start
    updates.current_period_end = periodDates.end
  }

  if (changes.seats !== undefined && changes.seats !== current.seats) {
    updates.seats = changes.seats

    await supabase
      .from('seat_allocations')
      .update({
        total_seats: changes.seats,
        available_seats: changes.seats - (await checkSeatAvailability(current.orgId)).usedSeats,
      })
      .eq('org_id', current.orgId)
      .eq('plan_id', current.planId)
  }

  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error || !updated) {
    throw new Error(`Failed to update subscription: ${error?.message ?? 'Unknown error'}`)
  }

  return getSubscription(id) as Promise<Subscription>
}

// ──────────────────────────────────────────────────────────────
// cancelSubscription
// ──────────────────────────────────────────────────────────────

export async function cancelSubscription(
  id: string,
  reason: string,
  immediate: boolean = false
): Promise<Subscription> {
  const supabase = await createClient()
  const current = await getSubscription(id)

  if (!current) {
    throw new Error(`Subscription not found: ${id}`)
  }

  if (immediate) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        cancelled_reason: reason,
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`)
    }
  } else {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_reason: reason,
      })
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to schedule cancellation: ${error.message}`)
    }
  }

  return getSubscription(id) as Promise<Subscription>
}

// ──────────────────────────────────────────────────────────────
// reactivateSubscription
// ──────────────────────────────────────────────────────────────

export async function reactivateSubscription(id: string): Promise<Subscription> {
  const supabase = await createClient()
  const current = await getSubscription(id)

  if (!current) {
    throw new Error(`Subscription not found: ${id}`)
  }

  if (current.status !== 'cancelled' && !current.cancelAtPeriodEnd) {
    throw new Error('Subscription is not cancelled or scheduled for cancellation')
  }

  // Reset period dates
  const periodDates = calculatePeriodDates(current.billingCycle)

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      cancel_at_period_end: false,
      cancelled_at: null,
      cancelled_reason: null,
      current_period_start: periodDates.start,
      current_period_end: periodDates.end,
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to reactivate subscription: ${error.message}`)
  }

  return getSubscription(id) as Promise<Subscription>
}

// ──────────────────────────────────────────────────────────────
// changePlan — with proration
// ──────────────────────────────────────────────────────────────

export async function changePlan(
  subscriptionId: string,
  newPlan: PlanTier
): Promise<{ subscription: Subscription; proration: ProrationResult }> {
  const current = await getSubscription(subscriptionId)

  if (!current) {
    throw new Error(`Subscription not found: ${subscriptionId}`)
  }

  if (current.planTier === newPlan) {
    throw new Error('Already on this plan')
  }

  const proration = calculateProration(
    current.planTier,
    newPlan,
    new Date(current.currentPeriodStart),
    new Date()
  )

  const updated = await updateSubscription(subscriptionId, { plan: newPlan })

  return { subscription: updated, proration }
}

// ──────────────────────────────────────────────────────────────
// calculateProration — Day-based proration calculation
// ──────────────────────────────────────────────────────────────

export function calculateProration(
  currentPlan: PlanTier,
  newPlan: PlanTier,
  currentCycleStart: Date,
  changeDate: Date
): ProrationResult {
  // Get the current period end from the cycle start
  // We estimate the period as monthly if not otherwise known
  const currentCycleEnd = new Date(currentCycleStart)
  currentCycleEnd.setMonth(currentCycleEnd.getMonth() + 1)

  const totalDaysInPeriod = Math.max(
    1,
    Math.ceil(
      (currentCycleEnd.getTime() - currentCycleStart.getTime()) / (1000 * 60 * 60 * 24)
    )
  )

  const remainingMs = currentCycleEnd.getTime() - changeDate.getTime()
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)))

  const usedDays = totalDaysInPeriod - remainingDays

  // Price lookups from DB plans are async, so we use static base prices
  // These are the standard base prices per month for each tier
  const PLAN_BASE_PRICES: Record<PlanTier, number> = {
    free: 0,
    starter: 2999,
    professional: 9999,
    enterprise: 49999,
  }

  const currentPlanPrice = PLAN_BASE_PRICES[currentPlan]
  const newPlanPrice = PLAN_BASE_PRICES[newPlan]

  // Credit for unused time on current plan
  const creditAmount = (currentPlanPrice / totalDaysInPeriod) * remainingDays

  // Debit for remaining time on new plan
  const debitAmount = (newPlanPrice / totalDaysInPeriod) * remainingDays

  // Net: positive means customer owes more, negative means credit
  const netAmount = debitAmount - creditAmount

  return {
    creditAmount: Math.round(creditAmount * 100) / 100,
    debitAmount: Math.round(debitAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    remainingDays,
    totalDaysInPeriod,
    creditDescription: `Proration credit: ${remainingDays}/${totalDaysInPeriod} days unused on ${currentPlan} plan`,
    debitDescription: `Proration charge: ${remainingDays}/${totalDaysInPeriod} days remaining on ${newPlan} plan`,
  }
}

// ──────────────────────────────────────────────────────────────
// getSubscriptionUsage
// ──────────────────────────────────────────────────────────────

export async function getSubscriptionUsage(subscriptionId: string): Promise<MeteredUsage[]> {
  const supabase = await createClient()
  const subscription = await getSubscription(subscriptionId)

  if (!subscription) return []

  const { data: usageRecords } = await supabase
    .from('usage_records')
    .select('metric, quantity')
    .eq('org_id', subscription.orgId)
    .gte('timestamp', subscription.currentPeriodStart)
    .lte('timestamp', subscription.currentPeriodEnd)

  if (!usageRecords || usageRecords.length === 0) return []

  // Aggregate by metric
  const aggregated: Record<string, number> = {}
  for (const record of usageRecords) {
    const metric = record.metric as string
    aggregated[metric] = (aggregated[metric] ?? 0) + (record.quantity ?? 0)
  }

  // Get metered pricing
  const { data: pricing } = await supabase
    .from('metered_pricing')
    .select('metric, unit_price, included_quantity')
    .eq('plan_tier', subscription.planTier)

  const pricingMap: Record<string, { unitPrice: number; includedQuantity: number }> = {}
  for (const p of pricing ?? []) {
    pricingMap[p.metric as string] = {
      unitPrice: p.unit_price ?? 0,
      includedQuantity: p.included_quantity ?? 0,
    }
  }

  return Object.entries(aggregated).map(([metric, quantity]) => {
    const metricPricing = pricingMap[metric] ?? { unitPrice: 0, includedQuantity: 0 }
    const overage = Math.max(0, quantity - metricPricing.includedQuantity)

    return {
      metric: metric as MeteredUsage['metric'],
      quantity,
      unitPrice: metricPricing.unitPrice,
      total: overage * metricPricing.unitPrice,
      includedQuantity: metricPricing.includedQuantity,
      overageQuantity: overage,
    }
  })
}

// ──────────────────────────────────────────────────────────────
// checkSeatAvailability
// ──────────────────────────────────────────────────────────────

export async function checkSeatAvailability(orgId: string): Promise<SeatAllocation> {
  const supabase = await createClient()

  const { data: allocation } = await supabase
    .from('seat_allocations')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle()

  if (allocation) {
    return {
      id: allocation.id,
      orgId: allocation.org_id ?? orgId,
      planId: allocation.plan_id ?? '',
      totalSeats: allocation.total_seats ?? 0,
      usedSeats: allocation.used_seats ?? 0,
      availableSeats: allocation.available_seats ?? 0,
      seatPrice: allocation.seat_price ?? 0,
      currency: allocation.currency ?? 'NGN',
      updatedAt: allocation.updated_at ?? new Date().toISOString(),
    }
  }

  // Count active users if no allocation record
  const { count: usedSeats } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', orgId)
    .eq('is_active', true)

  return {
    id: '',
    orgId,
    planId: '',
    totalSeats: 10,
    usedSeats: usedSeats ?? 0,
    availableSeats: 10 - (usedSeats ?? 0),
    seatPrice: 0,
    currency: 'NGN',
    updatedAt: new Date().toISOString(),
  }
}

// ──────────────────────────────────────────────────────────────
// addSeats
// ──────────────────────────────────────────────────────────────

export async function addSeats(subscriptionId: string, additionalSeats: number): Promise<SeatAllocation> {
  const supabase = await createClient()
  const subscription = await getSubscription(subscriptionId)

  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`)
  }

  if (additionalSeats <= 0) {
    throw new Error('Additional seats must be a positive number')
  }

  // Update seat allocation
  const { data: allocation, error } = await supabase
    .from('seat_allocations')
    .update({
      total_seats: supabase.rpc('increment', { row_id: subscription.orgId, column_name: 'total_seats', increment_value: additionalSeats }),
      available_seats: supabase.rpc('increment', { row_id: subscription.orgId, column_name: 'available_seats', increment_value: additionalSeats }),
    })
    .eq('org_id', subscription.orgId)
    .eq('plan_id', subscription.planId)
    .select('*')
    .single()

  // Fallback: manual increment
  if (error) {
    const { data: current } = await supabase
      .from('seat_allocations')
      .select('total_seats, available_seats')
      .eq('org_id', subscription.orgId)
      .eq('plan_id', subscription.planId)
      .maybeSingle()

    if (current) {
      await supabase
        .from('seat_allocations')
        .update({
          total_seats: current.total_seats + additionalSeats,
          available_seats: current.available_seats + additionalSeats,
        })
        .eq('org_id', subscription.orgId)
        .eq('plan_id', subscription.planId)
    }
  }

  // Update subscription seats
  await supabase
    .from('subscriptions')
    .update({ seats: subscription.seats + additionalSeats })
    .eq('id', subscriptionId)

  return checkSeatAvailability(subscription.orgId)
}

// ──────────────────────────────────────────────────────────────
// removeSeats
// ──────────────────────────────────────────────────────────────

export async function removeSeats(subscriptionId: string, seatsToRemove: number): Promise<SeatAllocation> {
  const supabase = await createClient()
  const subscription = await getSubscription(subscriptionId)

  if (!subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`)
  }

  const current = await checkSeatAvailability(subscription.orgId)

  if (seatsToRemove <= 0) {
    throw new Error('Seats to remove must be a positive number')
  }

  if (seatsToRemove > current.availableSeats) {
    throw new Error(`Cannot remove ${seatsToRemove} seats — only ${current.availableSeats} available (unused) seats`)
  }

  // Update seat allocation
  await supabase
    .from('seat_allocations')
    .update({
      total_seats: current.totalSeats - seatsToRemove,
      available_seats: current.availableSeats - seatsToRemove,
    })
    .eq('org_id', subscription.orgId)
    .eq('plan_id', subscription.planId)

  // Update subscription seats
  await supabase
    .from('subscriptions')
    .update({ seats: subscription.seats - seatsToRemove })
    .eq('id', subscriptionId)

  return checkSeatAvailability(subscription.orgId)
}

// ──────────────────────────────────────────────────────────────
// getOrganizationBilling — Full billing overview
// ──────────────────────────────────────────────────────────────

export async function getOrganizationBilling(orgId: string): Promise<OrganizationBillingOverview> {
  const supabase = await createClient()

  // Get active subscription
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('org_id', orgId)
    .in('status', ['active', 'trial', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let subscription: Subscription | null = null
  if (subData) {
    subscription = {
      id: subData.id,
      orgId: subData.org_id ?? orgId,
      userId: subData.user_id ?? '',
      planId: subData.plan_id ?? '',
      planTier: subData.plan_tier as PlanTier,
      billingCycle: subData.billing_cycle as BillingCycle,
      billingModel: subData.billing_model as BillingModel,
      status: subData.status ?? 'active',
      seats: subData.seats ?? 1,
      currentPeriodStart: subData.current_period_start ?? '',
      currentPeriodEnd: subData.current_period_end ?? '',
      cancelAtPeriodEnd: subData.cancel_at_period_end ?? false,
      cancelledAt: subData.cancelled_at ?? null,
      cancelledReason: subData.cancelled_reason ?? null,
      couponId: subData.coupon_id ?? null,
      trialStart: subData.trial_start ?? null,
      trialEnd: subData.trial_end ?? null,
      createdAt: subData.created_at ?? '',
      updatedAt: subData.updated_at ?? '',
    }
  }

  // Get plan
  const planTier = subscription?.planTier ?? 'free'
  const plan = await resolvePlan(planTier)

  // Seat allocation
  const seatAllocation = subscription ? await checkSeatAvailability(orgId) : null

  // Current usage
  const currentUsage: MeteredUsage[] = subscription
    ? await getSubscriptionUsage(subscription.id)
    : []

  // Outstanding invoices
  const { data: outstandingData } = await supabase
    .from('invoices')
    .select('*')
    .eq('org_id', orgId)
    .in('status', ['sent', 'draft'])
    .order('due_date', { ascending: true })

  const outstandingInvoices: Invoice[] = (outstandingData ?? []).map((inv) => ({
    id: inv.id,
    orgId: inv.org_id ?? orgId,
    number: inv.number ?? '',
    lineItems: (inv.line_items ?? []) as Invoice['lineItems'],
    subtotal: inv.subtotal ?? 0,
    tax: inv.tax ?? 0,
    discount: inv.discount ?? 0,
    total: inv.total ?? 0,
    currency: inv.currency ?? 'NGN',
    status: inv.status as Invoice['status'],
    dueDate: inv.due_date ?? '',
    issuedAt: inv.issued_at ?? null,
    paidAt: inv.paid_at ?? null,
    voidedAt: inv.voided_at ?? null,
    createdAt: inv.created_at ?? '',
    updatedAt: inv.updated_at ?? '',
    notes: inv.notes ?? undefined,
    couponId: inv.coupon_id ?? undefined,
    subscriptionId: inv.subscription_id ?? undefined,
  }))

  // Recent invoices
  const { data: recentData } = await supabase
    .from('invoices')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(10)

  const recentInvoices: Invoice[] = (recentData ?? []).map((inv) => ({
    id: inv.id,
    orgId: inv.org_id ?? orgId,
    number: inv.number ?? '',
    lineItems: (inv.line_items ?? []) as Invoice['lineItems'],
    subtotal: inv.subtotal ?? 0,
    tax: inv.tax ?? 0,
    discount: inv.discount ?? 0,
    total: inv.total ?? 0,
    currency: inv.currency ?? 'NGN',
    status: inv.status as Invoice['status'],
    dueDate: inv.due_date ?? '',
    issuedAt: inv.issued_at ?? null,
    paidAt: inv.paid_at ?? null,
    voidedAt: inv.voided_at ?? null,
    createdAt: inv.created_at ?? '',
    updatedAt: inv.updated_at ?? '',
    notes: inv.notes ?? undefined,
    couponId: inv.coupon_id ?? undefined,
    subscriptionId: inv.subscription_id ?? undefined,
  }))

  // Upcoming invoice
  const upcomingInvoice = subscription
    ? {
        amount: plan ? getPlanPriceForCycle(plan, subscription.billingCycle) : 0,
        currency: plan?.currency ?? 'NGN',
        date: subscription.currentPeriodEnd,
      }
    : null

  return {
    subscription,
    plan,
    seatAllocation,
    currentUsage,
    outstandingInvoices,
    recentInvoices,
    upcomingInvoice,
  }
}
