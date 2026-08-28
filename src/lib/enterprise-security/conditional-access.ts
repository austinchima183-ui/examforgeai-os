// ============================================================================
// ExamForge AI — Conditional Access Policy Engine
// ============================================================================
// Enterprise conditional access system inspired by Azure AD and Okta.
// Evaluates policies on every authentication attempt based on:
// IP ranges, device trust, time of day, location, risk level, and more.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import type {
  ConditionalAccessPolicy,
  ConditionalAccessConditions,
  GrantControls,
  AccessEvaluationResult,
  AccessEvaluationContext,
  TimeRangeCondition,
  DeviceTrustLevel,
  RiskLevel,
} from './types'

// ──────────────────────────────────────────────────────────────
// Conditional Access Policy CRUD
// ──────────────────────────────────────────────────────────────

/**
 * Create a new conditional access policy for an organization.
 */
export async function createPolicy(
  orgId: string,
  policy: Omit<ConditionalAccessPolicy, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>
): Promise<ConditionalAccessPolicy> {
  const supabase = await createClient()
  const id = randomUUID()
  const now = new Date().toISOString()

  const fullPolicy: ConditionalAccessPolicy = {
    id,
    name: policy.name,
    organizationId: orgId,
    conditions: policy.conditions,
    grantControls: policy.grantControls,
    enabled: policy.enabled,
    priority: policy.priority,
    description: policy.description,
    createdAt: now,
    updatedAt: now,
  }

  const { error } = await supabase
    .from('conditional_access_policies')
    .insert({
      id,
      organization_id: orgId,
      name: fullPolicy.name,
      conditions: fullPolicy.conditions,
      grant_controls: fullPolicy.grantControls,
      enabled: fullPolicy.enabled,
      priority: fullPolicy.priority,
      description: fullPolicy.description,
      created_at: now,
      updated_at: now,
    })

  if (error) {
    throw new Error(`Failed to create conditional access policy: ${error.message}`)
  }

  return fullPolicy
}

/**
 * Update an existing conditional access policy.
 */
export async function updatePolicy(
  policyId: string,
  updates: Partial<Omit<ConditionalAccessPolicy, 'id' | 'organizationId' | 'createdAt'>>
): Promise<ConditionalAccessPolicy> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const updateData: Record<string, unknown> = {
    updated_at: now,
  }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.conditions !== undefined) updateData.conditions = updates.conditions
  if (updates.grantControls !== undefined) updateData.grant_controls = updates.grantControls
  if (updates.enabled !== undefined) updateData.enabled = updates.enabled
  if (updates.priority !== undefined) updateData.priority = updates.priority
  if (updates.description !== undefined) updateData.description = updates.description

  const { data, error } = await supabase
    .from('conditional_access_policies')
    .update(updateData)
    .eq('id', policyId)
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to update conditional access policy: ${error.message}`)
  }

  return mapRowToPolicy(data)
}

/**
 * Delete a conditional access policy.
 */
export async function deletePolicy(policyId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('conditional_access_policies')
    .delete()
    .eq('id', policyId)

  if (error) {
    throw new Error(`Failed to delete conditional access policy: ${error.message}`)
  }

  return true
}

/**
 * List all conditional access policies for an organization.
 */
export async function listPolicies(orgId: string): Promise<ConditionalAccessPolicy[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('conditional_access_policies')
    .select('*')
    .eq('organization_id', orgId)
    .order('priority', { ascending: true })

  if (error) {
    throw new Error(`Failed to list conditional access policies: ${error.message}`)
  }

  return (data || []).map(mapRowToPolicy)
}

// ──────────────────────────────────────────────────────────────
// Policy Evaluation Engine
// ──────────────────────────────────────────────────────────────

/**
 * Evaluate all conditional access policies for an authentication attempt.
 * Policies are evaluated in priority order (lowest first).
 * The most restrictive result wins (block > requireMfa > allow).
 */
export async function evaluateAccess(
  userId: string,
  orgId: string,
  context: AccessEvaluationContext
): Promise<AccessEvaluationResult> {
  const policies = await listPolicies(orgId)
  const enabledPolicies = policies.filter(p => p.enabled)
  const sortedPolicies = sortPoliciesByPriority(enabledPolicies)

  const result: AccessEvaluationResult = {
    allowed: true,
    mfaRequired: false,
    compliantDeviceRequired: false,
    approvedAppRequired: false,
    passkeyRequired: false,
    matchedPolicies: [],
    blockReason: null,
  }

  for (const policy of sortedPolicies) {
    const conditionsMet = evaluateConditions(policy.conditions, context)

    if (conditionsMet) {
      result.matchedPolicies.push(policy.id)

      // Apply grant controls — most restrictive wins
      const controlsResult = applyGrantControls(policy.grantControls)

      // Block access takes highest priority
      if (controlsResult.blockAccess) {
        result.allowed = false
        result.blockReason = policy.grantControls.blockMessage || `Blocked by policy: ${policy.name}`
        result.mfaRequired = false
        result.compliantDeviceRequired = false
        result.approvedAppRequired = false
        result.passkeyRequired = false
        break // Block is final — no further evaluation needed
      }

      // Accumulate requirements (OR logic — any policy can add requirements)
      if (controlsResult.requireMfa) result.mfaRequired = true
      if (controlsResult.requireCompliantDevice) result.compliantDeviceRequired = true
      if (controlsResult.requireApprovedApp) result.approvedAppRequired = true
      if (controlsResult.requirePasskey) result.passkeyRequired = true
    }
  }

  return result
}

/**
 * Evaluate whether the conditions of a policy are met by the current context.
 * All conditions within a policy are evaluated with AND logic
 * (all must be true for the policy to apply).
 */
export function evaluateConditions(
  conditions: ConditionalAccessConditions,
  context: AccessEvaluationContext
): boolean {
  // Condition 1: IP range check
  if (conditions.ipRange.length > 0) {
    const ipInRange = isIpInRanges(context.ip, conditions.ipRange)
    if (!ipInRange) return false
  }

  // Condition 2: Device trust level check
  if (conditions.deviceTrust.length > 0) {
    const trustMet = conditions.deviceTrust.includes(context.deviceTrustLevel)
    if (!trustMet) return false
  }

  // Condition 3: Time range check
  if (conditions.timeRange) {
    const timeInRange = isTimeInRange(conditions.timeRange, context.timestamp)
    if (!timeInRange) return false
  }

  // Condition 4: Location check (country codes)
  if (conditions.location.length > 0) {
    if (!context.location) return false
    const locationMet = conditions.location.includes(context.location)
    if (!locationMet) return false
  }

  // Condition 5: Risk level check
  if (conditions.riskLevel !== null) {
    const riskMet = isRiskLevelAcceptable(context.riskLevel, conditions.riskLevel)
    if (!riskMet) return false
  }

  // Condition 6: User role check
  if (conditions.userRoles.length > 0) {
    const roleMet = conditions.userRoles.some(role => context.userRoles.includes(role))
    if (!roleMet) return false
  }

  // Condition 7: Application check
  if (conditions.applications.length > 0) {
    if (!context.applicationId) return false
    const appMet = conditions.applications.includes(context.applicationId)
    if (!appMet) return false
  }

  return true
}

/**
 * Apply grant controls and return the resulting requirements.
 */
export function applyGrantControls(controls: GrantControls): {
  requireMfa: boolean
  requireCompliantDevice: boolean
  requireApprovedApp: boolean
  requirePasskey: boolean
  blockAccess: boolean
} {
  return {
    requireMfa: controls.requireMfa,
    requireCompliantDevice: controls.requireCompliantDevice,
    requireApprovedApp: controls.requireApprovedApp,
    requirePasskey: controls.requirePasskey,
    blockAccess: controls.blockAccess,
  }
}

/**
 * Sort policies by priority (lower number = higher priority = evaluated first).
 */
export function sortPoliciesByPriority(
  policies: ConditionalAccessPolicy[]
): ConditionalAccessPolicy[] {
  return [...policies].sort((a, b) => a.priority - b.priority)
}

// ──────────────────────────────────────────────────────────────
// Condition Evaluation Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Check if an IP address falls within any of the given CIDR ranges.
 * Supports IPv4 CIDR notation (e.g., "192.168.0.0/24").
 */
function isIpInRanges(ip: string, ranges: string[]): boolean {
  for (const range of ranges) {
    if (isIpInRange(ip, range)) return true
  }
  return false
}

/**
 * Check if an IP address is within a single CIDR range.
 * Implements proper CIDR matching using bitwise operations.
 */
function isIpInRange(ip: string, cidr: string): boolean {
  try {
    const [rangeIp, prefixLengthStr] = cidr.split('/')
    const prefixLength = parseInt(prefixLengthStr || '32', 10)

    const ipInt = ipv4ToInt(ip)
    const rangeInt = ipv4ToInt(rangeIp)

    if (ipInt === null || rangeInt === null) return false

    // Create subnet mask from prefix length
    const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0

    // Check if network portions match
    return (ipInt & mask) === (rangeInt & mask)
  } catch {
    return false
  }
}

/**
 * Convert an IPv4 address to a 32-bit integer.
 */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null

  let result = 0
  for (let i = 0; i < 4; i++) {
    const part = parseInt(parts[i], 10)
    if (isNaN(part) || part < 0 || part > 255) return null
    result = (result << 8) | part
  }

  return result >>> 0 // Convert to unsigned
}

/**
 * Check if the current time falls within the specified time range.
 * Handles timezone conversion and day-of-week filtering.
 */
function isTimeInRange(
  timeRange: TimeRangeCondition,
  timestamp: string
): boolean {
  try {
    const date = new Date(timestamp)

    // Convert to the specified timezone
    const localizedDate = new Date(date.toLocaleString('en-US', { timeZone: timeRange.timezone }))
    const dayOfWeek = localizedDate.getDay()
    const hour = localizedDate.getHours()

    // Check day of week
    if (timeRange.daysOfWeek.length > 0 && !timeRange.daysOfWeek.includes(dayOfWeek)) {
      return false
    }

    // Check hour range
    if (timeRange.startHour <= timeRange.endHour) {
      // Normal range (e.g., 9-17)
      return hour >= timeRange.startHour && hour < timeRange.endHour
    } else {
      // Overnight range (e.g., 22-6)
      return hour >= timeRange.startHour || hour < timeRange.endHour
    }
  } catch {
    return false
  }
}

/**
 * Risk level hierarchy for comparison.
 */
const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  very_low: 0,
  low: 1,
  medium: 2,
  high: 3,
  very_high: 4,
}

/**
 * Check if the current risk level is acceptable given the maximum allowed.
 * The user's risk level must be at or below the maximum allowed.
 */
function isRiskLevelAcceptable(
  currentRiskLevel: RiskLevel,
  maxAllowedRiskLevel: RiskLevel
): boolean {
  return RISK_LEVEL_ORDER[currentRiskLevel] <= RISK_LEVEL_ORDER[maxAllowedRiskLevel]
}

// ──────────────────────────────────────────────────────────────
// Internal Mapping
// ──────────────────────────────────────────────────────────────

/**
 * Map a database row to ConditionalAccessPolicy.
 */
function mapRowToPolicy(row: Record<string, unknown>): ConditionalAccessPolicy {
  return {
    id: row.id as string,
    name: row.name as string,
    organizationId: row.organization_id as string,
    conditions: row.conditions as ConditionalAccessConditions,
    grantControls: row.grant_controls as GrantControls,
    enabled: row.enabled as boolean,
    priority: row.priority as number,
    description: (row.description as string) || null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}
