// ============================================================================
// ExamForge AI — Built-In Event Handlers
// ============================================================================
// Production handlers that power core Event Bus features:
// - AuditLogHandler: Persists every event to audit_logs table
// - NotificationHandler: Converts events to notifications
// - AnalyticsHandler: Tracks events for dashboards
// - AIMemoryHandler: Feeds events to AI as context/memory
// - WebhookHandler: Dispatches events to registered webhook URLs
// - WorkflowTriggerHandler: Triggers automation workflows
// - RealtimeHandler: Broadcasts via Supabase Realtime
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  BaseEvent,
  HandlerResult,
  EventPayloadMap,
  WebhookRegistration,
  WorkflowTriggerRule,
} from './types'
import { EventType } from './types'
import { eventBus } from './event-emitter'

// ──────────────────────────────────────────────────────────────
// 1. Audit Log Handler — Persists every event to audit_logs
// ──────────────────────────────────────────────────────────────

async function auditLogHandler(event: BaseEvent): Promise<HandlerResult> {
  const start = Date.now()
  try {
    const supabase = await createClient()

    const auditRecord = {
      event_id: event.id,
      event_type: event.type,
      timestamp: event.timestamp,
      user_id: event.source.userId,
      school_id: event.source.schoolId ?? null,
      org_id: event.source.orgId ?? null,
      correlation_id: event.metadata.correlationId,
      causation_id: event.metadata.causationId ?? null,
      payload: JSON.stringify(event.payload),
      version: event.metadata.version,
      emitted_by: event.metadata.emittedBy ?? null,
      environment: event.metadata.environment ?? null,
    }

    const { error } = await supabase.from('audit_logs').insert(auditRecord)

    if (error) {
      // If table doesn't exist yet, log warning but don't fail
      console.warn('[AuditLogHandler] Insert failed:', error.message)
      return {
        handlerId: 'audit_log',
        success: true, // Non-critical — don't block the pipeline
        error: error.message,
        durationMs: Date.now() - start,
      }
    }

    return {
      handlerId: 'audit_log',
      success: true,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      handlerId: 'audit_log',
      success: true, // Non-critical
      error: err instanceof Error ? err.message : 'Audit log error',
      durationMs: Date.now() - start,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// 2. Notification Handler — Converts events to notifications
// ──────────────────────────────────────────────────────────────

interface NotificationMapping {
  targetUserId: string | ((payload: unknown) => string)
  title: string | ((payload: unknown) => string)
  body: string | ((payload: unknown) => string)
  type: string
  priority?: string
  actionUrl?: string | ((payload: unknown) => string)
}

function resolveField(field: string | ((payload: unknown) => string), payload: unknown): string {
  return typeof field === 'function' ? field(payload) : field
}

const NOTIFICATION_MAPPINGS: Partial<Record<EventType, NotificationMapping>> = {
  [EventType.ExamSubmitted]: {
    targetUserId: (p) => (p as EventPayloadMap[EventType.ExamSubmitted]).studentId,
    title: 'Exam Submitted',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.ExamSubmitted]
      return `Student submitted exam ${payload.examId} (${payload.questionAnswered}/${payload.questionTotal} questions answered)`
    },
    type: 'exam_result',
    priority: 'high',
    actionUrl: (p) => `/exams/${(p as EventPayloadMap[EventType.ExamSubmitted]).examId}/grade`,
  },
  [EventType.ExamGraded]: {
    targetUserId: (p) => (p as EventPayloadMap[EventType.ExamGraded]).studentId,
    title: 'Exam Graded',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.ExamGraded]
      return `Your exam has been graded. Score: ${payload.percentage}% (${payload.score}/${payload.maxScore})`
    },
    type: 'exam_result',
    priority: 'high',
    actionUrl: (p) => `/exams/${(p as EventPayloadMap[EventType.ExamGraded]).examId}/results`,
  },
  [EventType.PaymentCompleted]: {
    targetUserId: (p) => (p as EventPayloadMap[EventType.PaymentCompleted]).userId,
    title: 'Payment Confirmed',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.PaymentCompleted]
      return `Payment of ${payload.currency} ${payload.amount} completed successfully. Ref: ${payload.reference}`
    },
    type: 'payment',
    priority: 'high',
  },
  [EventType.PaymentFailed]: {
    targetUserId: (p) => (p as EventPayloadMap[EventType.PaymentFailed]).userId,
    title: 'Payment Failed',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.PaymentFailed]
      return `Payment of ${payload.currency} ${payload.amount} failed. Please try again.`
    },
    type: 'payment',
    priority: 'urgent',
  },
  [EventType.SubscriptionCreated]: {
    targetUserId: (p) => (p as EventPayloadMap[EventType.SubscriptionCreated]).userId,
    title: 'Subscription Activated',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.SubscriptionCreated]
      return `Your ${payload.plan} subscription has been activated.`
    },
    type: 'subscription',
    priority: 'medium',
  },
  [EventType.SubscriptionUpgraded]: {
    targetUserId: (p) => (p as EventPayloadMap[EventType.SubscriptionUpgraded]).userId,
    title: 'Subscription Upgraded',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.SubscriptionUpgraded]
      return `Your subscription has been upgraded from ${payload.previousPlan} to ${payload.newPlan}.`
    },
    type: 'subscription',
    priority: 'medium',
  },
  [EventType.AttendanceAlertTriggered]: {
    targetUserId: (p) => (p as EventPayloadMap[EventType.AttendanceAlertTriggered]).studentId,
    title: 'Attendance Alert',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.AttendanceAlertTriggered]
      return `Student has ${payload.consecutiveAbsences} consecutive absences (${payload.totalAbsences} total). Alert: ${payload.alertType}`
    },
    type: 'system',
    priority: 'urgent',
  },
  [EventType.CertificateIssued]: {
    targetUserId: (p) => (p as EventPayloadMap[EventType.CertificateIssued]).studentId,
    title: 'Certificate Issued',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.CertificateIssued]
      return `Congratulations! Your certificate "${payload.title}" has been issued.`
    },
    type: 'system',
    priority: 'medium',
    actionUrl: (p) => `/certificates/${(p as EventPayloadMap[EventType.CertificateIssued]).certificateId}`,
  },
  [EventType.MarketplacePurchase]: {
    targetUserId: (p) => (p as EventPayloadMap[EventType.MarketplacePurchase]).buyerId,
    title: 'Purchase Confirmed',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.MarketplacePurchase]
      return `You purchased "${payload.productTitle}" for ${payload.currency} ${payload.amount}.`
    },
    type: 'marketplace',
    priority: 'medium',
  },
  [EventType.StudentEnrolled]: {
    targetUserId: (p) => (p as EventPayloadMap[EventType.StudentEnrolled]).studentId,
    title: 'Enrollment Confirmed',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.StudentEnrolled]
      return `You have been enrolled in class ${payload.classId} at your school.`
    },
    type: 'enrollment',
    priority: 'medium',
  },
  [EventType.WorkflowFailed]: {
    targetUserId: () => 'system',
    title: 'Workflow Failed',
    body: (p) => {
      const payload = p as EventPayloadMap[EventType.WorkflowFailed]
      return `Workflow "${payload.workflowName}" failed at step "${payload.failedStepName}": ${payload.errorMessage}`
    },
    type: 'system',
    priority: 'urgent',
  },
}

async function notificationHandler(event: BaseEvent): Promise<HandlerResult> {
  const start = Date.now()
  try {
    const mapping = NOTIFICATION_MAPPINGS[event.type]
    if (!mapping) {
      return {
        handlerId: 'notification',
        success: true,
        durationMs: Date.now() - start,
        data: { skipped: true, reason: 'No notification mapping for this event type' },
      }
    }

    const supabase = await createClient()

    const targetUserId = resolveField(mapping.targetUserId, event.payload)
    const title = resolveField(mapping.title, event.payload)
    const body = resolveField(mapping.body, event.payload)
    const actionUrl = mapping.actionUrl ? resolveField(mapping.actionUrl, event.payload) : null

    const notificationRecord = {
      id: crypto.randomUUID(),
      user_id: targetUserId,
      title,
      body,
      type: mapping.type,
      priority: mapping.priority ?? 'normal',
      is_read: false,
      action_url: actionUrl,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('notifications').insert(notificationRecord)

    if (error) {
      console.warn('[NotificationHandler] Insert failed:', error.message)
      return {
        handlerId: 'notification',
        success: true, // Non-critical
        error: error.message,
        durationMs: Date.now() - start,
      }
    }

    return {
      handlerId: 'notification',
      success: true,
      durationMs: Date.now() - start,
      data: { notificationId: notificationRecord.id, targetUserId },
    }
  } catch (err) {
    return {
      handlerId: 'notification',
      success: true, // Non-critical
      error: err instanceof Error ? err.message : 'Notification handler error',
      durationMs: Date.now() - start,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// 3. Analytics Handler — Tracks events for dashboards
// ──────────────────────────────────────────────────────────────

async function analyticsHandler(event: BaseEvent): Promise<HandlerResult> {
  const start = Date.now()
  try {
    const supabase = await createClient()

    // Build analytics event record with enriched data
    const analyticsRecord = {
      event_name: event.type,
      event_id: event.id,
      user_id: event.source.userId,
      school_id: event.source.schoolId ?? null,
      org_id: event.source.orgId ?? null,
      properties: JSON.stringify(event.payload),
      timestamp: event.timestamp,
      session_id: event.metadata.correlationId,
    }

    const { error } = await supabase.from('analytics_events').insert(analyticsRecord)

    if (error) {
      // Try alternate table name
      const { error: error2 } = await supabase.from('event_analytics').insert(analyticsRecord)
      if (error2) {
        console.warn('[AnalyticsHandler] Insert failed:', error2.message)
      }
    }

    return {
      handlerId: 'analytics',
      success: true,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      handlerId: 'analytics',
      success: true, // Non-critical
      error: err instanceof Error ? err.message : 'Analytics handler error',
      durationMs: Date.now() - start,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// 4. AI Memory Handler — Feeds events to AI as context
// ──────────────────────────────────────────────────────────────

const AI_RELEVANT_EVENTS: EventType[] = [
  EventType.ExamSubmitted,
  EventType.ExamGraded,
  EventType.QuestionGenerated,
  EventType.AICompleted,
  EventType.AIFailed,
  EventType.StudentEnrolled,
  EventType.StudentWithdrawn,
  EventType.AttendanceAlertTriggered,
  EventType.PaymentCompleted,
  EventType.PaymentFailed,
  EventType.WorkflowTriggered,
  EventType.WorkflowCompleted,
  EventType.WorkflowFailed,
]

async function aiMemoryHandler(event: BaseEvent): Promise<HandlerResult> {
  const start = Date.now()
  try {
    // Only store AI-relevant events to avoid noise
    if (!AI_RELEVANT_EVENTS.includes(event.type)) {
      return {
        handlerId: 'ai_memory',
        success: true,
        durationMs: Date.now() - start,
        data: { skipped: true, reason: 'Event type not relevant for AI memory' },
      }
    }

    const supabase = await createClient()

    // Build a concise context summary for AI consumption
    const contextSummary = buildAIContextSummary(event)

    const memoryRecord = {
      id: crypto.randomUUID(),
      event_id: event.id,
      event_type: event.type,
      user_id: event.source.userId,
      school_id: event.source.schoolId ?? null,
      context_summary: contextSummary,
      event_data: JSON.stringify(event.payload),
      correlation_id: event.metadata.correlationId,
      timestamp: event.timestamp,
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('ai_event_memory').insert(memoryRecord)

    if (error) {
      console.warn('[AIMemoryHandler] Insert failed:', error.message)
      return {
        handlerId: 'ai_memory',
        success: true, // Non-critical
        error: error.message,
        durationMs: Date.now() - start,
      }
    }

    return {
      handlerId: 'ai_memory',
      success: true,
      durationMs: Date.now() - start,
      data: { memoryId: memoryRecord.id },
    }
  } catch (err) {
    return {
      handlerId: 'ai_memory',
      success: true,
      error: err instanceof Error ? err.message : 'AI memory handler error',
      durationMs: Date.now() - start,
    }
  }
}

function buildAIContextSummary(event: BaseEvent): string {
  const payload = event.payload as Record<string, unknown>
  switch (event.type) {
    case EventType.ExamSubmitted:
      return `Student ${payload.studentId ?? 'unknown'} submitted exam ${(payload as Record<string, unknown>).examId ?? 'unknown'}. Answered ${(payload as Record<string, unknown>).questionAnswered ?? 0}/${(payload as Record<string, unknown>).questionTotal ?? 0} questions in ${Math.round(((payload as Record<string, unknown>).durationMs as number ?? 0) / 60000)} minutes.`
    case EventType.ExamGraded:
      return `Exam ${(payload as Record<string, unknown>).examId ?? 'unknown'} graded for student ${payload.studentId ?? 'unknown'}. Score: ${(payload as Record<string, unknown>).percentage ?? 0}% (${(payload as Record<string, unknown>).score ?? 0}/${(payload as Record<string, unknown>).maxScore ?? 0}).`
    case EventType.AttendanceAlertTriggered:
      return `Attendance alert for student ${payload.studentId ?? 'unknown'}: ${(payload as Record<string, unknown>).consecutiveAbsences ?? 0} consecutive absences, ${(payload as Record<string, unknown>).totalAbsences ?? 0} total.`
    case EventType.AICompleted:
      return `AI generation completed: ${(payload as Record<string, unknown>).provider ?? 'unknown'}/${(payload as Record<string, unknown>).model ?? 'unknown'}. Tokens: ${(payload as Record<string, unknown>).tokensInput ?? 0}+${(payload as Record<string, unknown>).tokensOutput ?? 0}. Cost: $${(payload as Record<string, unknown>).costUsd ?? 0}.`
    default:
      return `Event ${event.type} occurred for user ${event.source.userId}.`
  }
}

// ──────────────────────────────────────────────────────────────
// 5. Webhook Handler — Dispatches events to registered URLs
// ──────────────────────────────────────────────────────────────

async function webhookHandler(event: BaseEvent): Promise<HandlerResult> {
  const start = Date.now()
  try {
    const supabase = await createClient()

    // Fetch active webhooks subscribed to this event type
    const { data: webhooks, error } = await supabase
      .from('webhook_registrations')
      .select('*')
      .eq('is_active', true)

    if (error || !webhooks || webhooks.length === 0) {
      return {
        handlerId: 'webhook',
        success: true,
        durationMs: Date.now() - start,
        data: { dispatched: 0, reason: error ? error.message : 'No active webhooks' },
      }
    }

    // Filter webhooks by event type
    const matchingWebhooks = (webhooks as WebhookRegistration[]).filter((w) =>
      w.eventTypes.includes(event.type)
    )

    if (matchingWebhooks.length === 0) {
      return {
        handlerId: 'webhook',
        success: true,
        durationMs: Date.now() - start,
        data: { dispatched: 0, reason: 'No webhooks subscribed to this event type' },
      }
    }

    const body = JSON.stringify({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      payload: event.payload,
      metadata: event.metadata,
    })

    const dispatchResults: Array<{ webhookId: string; success: boolean; statusCode?: number }> = []

    for (const webhook of matchingWebhooks) {
      try {
        // Compute HMAC-SHA256 signature for verification
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(webhook.secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
        const signature = Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-EventBus-Signature': `sha256=${signature}`,
            'X-EventBus-Event-Type': event.type,
            'X-EventBus-Delivery-Id': crypto.randomUUID(),
            'X-EventBus-Timestamp': event.timestamp,
          },
          body,
          signal: AbortSignal.timeout(10000),
        })

        dispatchResults.push({
          webhookId: webhook.id,
          success: response.ok,
          statusCode: response.status,
        })
      } catch (err) {
        dispatchResults.push({
          webhookId: webhook.id,
          success: false,
        })
        console.error(`[WebhookHandler] Dispatch to ${webhook.url} failed:`, err)
      }
    }

    const allSucceeded = dispatchResults.every((r) => r.success)

    return {
      handlerId: 'webhook',
      success: allSucceeded,
      durationMs: Date.now() - start,
      data: { dispatched: dispatchResults.length, results: dispatchResults },
    }
  } catch (err) {
    return {
      handlerId: 'webhook',
      success: true, // Non-critical
      error: err instanceof Error ? err.message : 'Webhook handler error',
      durationMs: Date.now() - start,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// 6. Workflow Trigger Handler — Triggers automation workflows
// ──────────────────────────────────────────────────────────────

async function workflowTriggerHandler(event: BaseEvent): Promise<HandlerResult> {
  const start = Date.now()
  try {
    const supabase = await createClient()

    // Fetch active workflow trigger rules matching this event type
    const { data: rules, error } = await supabase
      .from('workflow_trigger_rules')
      .select('*')
      .eq('event_type', event.type)
      .eq('is_active', true)

    if (error || !rules || rules.length === 0) {
      return {
        handlerId: 'workflow_trigger',
        success: true,
        durationMs: Date.now() - start,
        data: { triggered: 0, reason: error ? error.message : 'No matching trigger rules' },
      }
    }

    const triggeredWorkflows: Array<{ ruleId: string; workflowId: string; success: boolean }> = []

    for (const rule of rules as WorkflowTriggerRule[]) {
      try {
        // Evaluate conditions if present
        if (rule.conditions && rule.conditions.length > 0) {
          const payload = event.payload as Record<string, unknown>
          const allConditionsMet = rule.conditions.every((condition) => {
            const pathParts = condition.path.split('.')
            let current: unknown = payload
            for (const part of pathParts) {
              if (current === null || current === undefined || typeof current !== 'object') return false
              current = (current as Record<string, unknown>)[part]
            }
            switch (condition.operator) {
              case 'eq': return current === condition.value
              case 'neq': return current !== condition.value
              case 'gt': return typeof current === 'number' && current > (condition.value as number)
              case 'lt': return typeof current === 'number' && current < (condition.value as number)
              case 'in': return Array.isArray(condition.value) && condition.value.includes(current)
              case 'contains': return typeof current === 'string' && current.includes(condition.value as string)
              case 'exists': return current !== undefined && current !== null
              default: return true
            }
          })
          if (!allConditionsMet) continue
        }

        // Insert workflow execution record
        const executionId = crypto.randomUUID()
        const { error: execError } = await supabase.from('workflow_executions').insert({
          id: executionId,
          workflow_id: rule.workflowId,
          trigger_event_id: event.id,
          trigger_rule_id: rule.id,
          status: 'pending',
          correlation_id: event.metadata.correlationId,
          created_at: new Date().toISOString(),
        })

        if (execError) {
          triggeredWorkflows.push({ ruleId: rule.id, workflowId: rule.workflowId, success: false })
          continue
        }

        triggeredWorkflows.push({ ruleId: rule.id, workflowId: rule.workflowId, success: true })
      } catch (err) {
        triggeredWorkflows.push({
          ruleId: rule.id,
          workflowId: rule.workflowId,
          success: false,
        })
        console.error(`[WorkflowTriggerHandler] Rule ${rule.id} execution failed:`, err)
      }
    }

    const allSucceeded = triggeredWorkflows.every((r) => r.success)

    return {
      handlerId: 'workflow_trigger',
      success: allSucceeded,
      durationMs: Date.now() - start,
      data: { triggered: triggeredWorkflows.length, results: triggeredWorkflows },
    }
  } catch (err) {
    return {
      handlerId: 'workflow_trigger',
      success: true, // Non-critical
      error: err instanceof Error ? err.message : 'Workflow trigger error',
      durationMs: Date.now() - start,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// 7. Realtime Handler — Broadcasts via Supabase Realtime
// ──────────────────────────────────────────────────────────────

async function realtimeHandler(event: BaseEvent): Promise<HandlerResult> {
  const start = Date.now()
  try {
    const supabase = await createClient()

    const channel = supabase.channel(`event-bus:${event.type}`)

    channel.send({
      type: 'broadcast',
      event: event.type,
      payload: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        source: event.source,
        payload: event.payload,
        metadata: {
          correlationId: event.metadata.correlationId,
          version: event.metadata.version,
        },
      },
    })

    supabase.removeChannel(channel)

    return {
      handlerId: 'realtime',
      success: true,
      durationMs: Date.now() - start,
    }
  } catch (err) {
    return {
      handlerId: 'realtime',
      success: true, // Non-critical
      error: err instanceof Error ? err.message : 'Realtime broadcast error',
      durationMs: Date.now() - start,
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Register All Built-In Handlers
// ──────────────────────────────────────────────────────────────

export function registerBuiltinHandlers(): void {
  // Audit Log — all events, highest priority (must run first)
  for (const eventType of Object.values(EventType)) {
    eventBus.on(eventType, auditLogHandler, {
      id: `builtin_audit_log_${eventType}`,
      priority: 1,
    })
  }

  // Notification — all events (handler internally filters by mapping)
  for (const eventType of Object.values(EventType)) {
    eventBus.on(eventType, notificationHandler, {
      id: `builtin_notification_${eventType}`,
      priority: 10,
    })
  }

  // Analytics — all events, async (non-blocking)
  for (const eventType of Object.values(EventType)) {
    eventBus.onAsync(eventType, analyticsHandler, {
      id: `builtin_analytics_${eventType}`,
      priority: 20,
    })
  }

  // AI Memory — all events (handler internally filters by AI_RELEVANT_EVENTS)
  for (const eventType of Object.values(EventType)) {
    eventBus.onAsync(eventType, aiMemoryHandler, {
      id: `builtin_ai_memory_${eventType}`,
      priority: 30,
    })
  }

  // Webhook — all events, async
  for (const eventType of Object.values(EventType)) {
    eventBus.onAsync(eventType, webhookHandler, {
      id: `builtin_webhook_${eventType}`,
      priority: 40,
    })
  }

  // Workflow Trigger — all events, async
  for (const eventType of Object.values(EventType)) {
    eventBus.onAsync(eventType, workflowTriggerHandler, {
      id: `builtin_workflow_trigger_${eventType}`,
      priority: 50,
    })
  }

  // Realtime Broadcast — all events, async
  for (const eventType of Object.values(EventType)) {
    eventBus.onAsync(eventType, realtimeHandler, {
      id: `builtin_realtime_${eventType}`,
      priority: 60,
    })
  }
}

// ──────────────────────────────────────────────────────────────
// Export individual handlers for custom registration
// ──────────────────────────────────────────────────────────────

export {
  auditLogHandler,
  notificationHandler,
  analyticsHandler,
  aiMemoryHandler,
  webhookHandler,
  workflowTriggerHandler,
  realtimeHandler,
  NOTIFICATION_MAPPINGS,
  AI_RELEVANT_EVENTS,
}
