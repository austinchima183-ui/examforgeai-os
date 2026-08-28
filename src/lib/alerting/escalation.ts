// ============================================================================
// ExamForge AI — Alert Escalation Policies
// ============================================================================
// Evaluates and executes escalation policies for active incidents.
// Default policy: Level 1 (immediate Slack), Level 2 (5 min: Slack+Email),
// Level 3 (15 min: Slack+Email+SMS), Level 4 (30 min: all+page on-call).
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import type {
  AlertChannel,
  AlertEscalationPolicy,
  AlertIncident,
  EscalationAction,
  EscalationLevel,
  EscalationRecipient,
} from './types'

const log = createLogger('alerting:escalation')

// ──────────────────────────────────────────────────────────────
// Escalation Evaluation
// ──────────────────────────────────────────────────────────────

/**
 * Evaluate whether an incident should be escalated based on its
 * age and the escalation policy.
 *
 * @param incident — The active incident
 * @param policy   — The escalation policy to evaluate
 * @returns EscalationAction if escalation is needed, null otherwise
 */
export function evaluateEscalation(
  incident: AlertIncident,
  policy: AlertEscalationPolicy
): EscalationAction | null {
  // Only escalate firing incidents
  if (incident.status !== 'firing') {
    return null
  }

  const now = Date.now()
  const firedAt = new Date(incident.firedAt).getTime()
  const incidentAgeMinutes = (now - firedAt) / (60 * 1000)

  // Find the highest escalation level that should have triggered
  let triggeredLevel: EscalationLevel | null = null

  for (const level of policy.levels) {
    if (incidentAgeMinutes >= level.delayMinutes) {
      triggeredLevel = level
    }
  }

  if (!triggeredLevel) {
    return null // No level has triggered yet
  }

  // Check if the escalation has already been applied
  // (stored in incident metadata)
  const lastEscalationLevel = (incident.metadata._escalationLevel as number) ?? -1
  if (triggeredLevel.level <= lastEscalationLevel) {
    // Check for repeat escalation
    if (policy.repeatInterval > 0) {
      const lastEscalationAt = incident.metadata._lastEscalationAt as string | undefined
      if (lastEscalationAt) {
        const lastEscTime = new Date(lastEscalationAt).getTime()
        const timeSinceLastEscalation = (now - lastEscTime) / (60 * 1000)
        if (timeSinceLastEscalation < policy.repeatInterval) {
          return null // Not time for repeat yet
        }
      }
    } else {
      return null // Already escalated to this level and no repeat
    }
  }

  log.info('Escalation triggered', {
    incidentId: incident.id,
    level: triggeredLevel.level,
    incidentAgeMinutes: Math.round(incidentAgeMinutes),
  })

  return {
    level: triggeredLevel.level,
    channels: triggeredLevel.channels,
    recipients: triggeredLevel.recipients,
    reason: `Incident age ${Math.round(incidentAgeMinutes)}min exceeds escalation level ${triggeredLevel.level} threshold (${triggeredLevel.delayMinutes}min)`,
  }
}

// ──────────────────────────────────────────────────────────────
// Execute Escalation
// ──────────────────────────────────────────────────────────────

/**
 * Execute an escalation action for an incident.
 * Updates incident metadata and delivers notifications via the
 * specified channels and recipients.
 *
 * @param incidentId — The incident to escalate
 * @param level     — The escalation level being executed
 * @returns void
 */
export async function executeEscalation(
  incidentId: string,
  level: number
): Promise<void> {
  log.info('Executing escalation', { incidentId, level })

  try {
    // Import here to avoid circular dependency
    const { getIncident, updateIncidentMetadata } = await import('./incident-manager')
    const incident = await getIncident(incidentId)

    if (!incident) {
      log.warn('Incident not found for escalation', { incidentId })
      return
    }

    if (incident.status !== 'firing') {
      log.info('Incident no longer firing, skipping escalation', { incidentId, status: incident.status })
      return
    }

    // Update incident metadata to track escalation
    await updateIncidentMetadata(incidentId, {
      _escalationLevel: level,
      _lastEscalationAt: new Date().toISOString(),
    })

    // Add timeline event
    const { addTimelineEvent } = await import('./incident-manager')
    await addTimelineEvent(incidentId, {
      timestamp: new Date().toISOString(),
      type: 'escalated',
      actor: 'system',
      details: `Escalated to level ${level}`,
      metadata: { level },
    })

    log.info('Escalation executed', { incidentId, level })
  } catch (error) {
    log.error('Escalation execution failed', error, { incidentId, level })
  }
}

// ──────────────────────────────────────────────────────────────
// Default Escalation Policies
// ──────────────────────────────────────────────────────────────

const DEFAULT_RECIPIENTS: EscalationRecipient[] = [
  { type: 'channel', id: 'oncall-primary' },
]

const TEAM_RECIPIENTS: EscalationRecipient[] = [
  { type: 'team', id: 'engineering' },
  { type: 'channel', id: 'oncall-primary' },
]

const ALL_RECIPIENTS: EscalationRecipient[] = [
  { type: 'team', id: 'engineering' },
  { type: 'team', id: 'leadership' },
  { type: 'channel', id: 'oncall-primary' },
  { type: 'channel', id: 'oncall-secondary' },
]

/**
 * Get the default escalation policies.
 *
 * Default policy:
 * - Level 1: Immediate — Slack notification
 * - Level 2: 5 min — Slack + Email
 * - Level 3: 15 min — Slack + Email + SMS
 * - Level 4: 30 min — All channels + page on-call
 */
export function getEscalationPolicies(): AlertEscalationPolicy[] {
  return [
    {
      id: 'default-escalation',
      name: 'Default Escalation Policy',
      levels: [
        {
          level: 0,
          delayMinutes: 0,
          channels: ['slack' as AlertChannel],
          recipients: DEFAULT_RECIPIENTS,
        },
        {
          level: 1,
          delayMinutes: 5,
          channels: ['slack' as AlertChannel, 'email' as AlertChannel],
          recipients: DEFAULT_RECIPIENTS,
        },
        {
          level: 2,
          delayMinutes: 15,
          channels: ['slack' as AlertChannel, 'email' as AlertChannel, 'sms' as AlertChannel],
          recipients: TEAM_RECIPIENTS,
        },
        {
          level: 3,
          delayMinutes: 30,
          channels: ['slack' as AlertChannel, 'email' as AlertChannel, 'sms' as AlertChannel, 'webhook' as AlertChannel],
          recipients: ALL_RECIPIENTS,
        },
      ],
      repeatInterval: 0, // No repeat by default
    },
    {
      id: 'security-escalation',
      name: 'Security Alert Escalation',
      levels: [
        {
          level: 0,
          delayMinutes: 0,
          channels: ['slack' as AlertChannel, 'email' as AlertChannel],
          recipients: TEAM_RECIPIENTS,
        },
        {
          level: 1,
          delayMinutes: 2,
          channels: ['slack' as AlertChannel, 'email' as AlertChannel, 'sms' as AlertChannel],
          recipients: ALL_RECIPIENTS,
        },
        {
          level: 2,
          delayMinutes: 10,
          channels: ['slack' as AlertChannel, 'email' as AlertChannel, 'sms' as AlertChannel, 'webhook' as AlertChannel],
          recipients: ALL_RECIPIENTS,
        },
      ],
      repeatInterval: 15, // Repeat every 15 min for security
    },
    {
      id: 'payment-escalation',
      name: 'Payment Failure Escalation',
      levels: [
        {
          level: 0,
          delayMinutes: 0,
          channels: ['slack' as AlertChannel, 'email' as AlertChannel],
          recipients: [
            { type: 'team', id: 'finance' },
            { type: 'channel', id: 'oncall-primary' },
          ],
        },
        {
          level: 1,
          delayMinutes: 5,
          channels: ['slack' as AlertChannel, 'email' as AlertChannel, 'sms' as AlertChannel],
          recipients: ALL_RECIPIENTS,
        },
      ],
      repeatInterval: 0,
    },
  ]
}

/**
 * Get the appropriate escalation policy for an incident category.
 *
 * @param category — The alert category
 * @returns The matching escalation policy
 */
export function getPolicyForCategory(category: string): AlertEscalationPolicy {
  const policies = getEscalationPolicies()

  // Route to specialised policies
  if (category === 'security') {
    return policies.find(p => p.id === 'security-escalation')!
  }
  if (category === 'payment_failure') {
    return policies.find(p => p.id === 'payment-escalation')!
  }

  // Default
  return policies.find(p => p.id === 'default-escalation')!
}
