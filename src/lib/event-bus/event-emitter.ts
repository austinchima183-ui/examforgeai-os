// ============================================================================
// ExamForge AI — Core Event Emitter (Singleton)
// ============================================================================
// Central event bus that processes every event through a full pipeline:
// 1. Validate event schema
// 2. Apply subscriber filters
// 3. Execute sync handlers by priority
// 4. Queue async handlers (fire-and-forget with error isolation)
// 5. Persist to event_history table (Supabase)
// 6. Fire Supabase Realtime for live updates
// 7. Return handler results
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  BaseEvent,
  EventHandler,
  EventSubscription,
  EventFilter,
  EmitResult,
  HandlerResult,
  EventChannel,
} from './types'
import { EventType } from './types'

// ──────────────────────────────────────────────────────────────
// Validation Helpers
// ──────────────────────────────────────────────────────────────

function isValidEvent(event: BaseEvent): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!event.id || typeof event.id !== 'string') {
    errors.push('Event must have a valid string id')
  }
  if (!event.type || !(event.type in EventType)) {
    errors.push(`Event type "${event.type}" is not a valid EventType`)
  }
  if (!event.timestamp || isNaN(Date.parse(event.timestamp))) {
    errors.push('Event must have a valid ISO 8601 timestamp')
  }
  if (!event.source?.userId || typeof event.source.userId !== 'string') {
    errors.push('Event source must have a valid userId')
  }
  if (!event.metadata?.correlationId || typeof event.metadata.correlationId !== 'string') {
    errors.push('Event metadata must have a valid correlationId')
  }
  if (typeof event.metadata?.version !== 'number' || event.metadata.version < 1) {
    errors.push('Event metadata must have a version >= 1')
  }
  if (event.payload === undefined) {
    errors.push('Event must have a payload')
  }

  return { valid: errors.length === 0, errors }
}

function matchesFilter(payload: unknown, filter: EventFilter): boolean {
  const pathParts = filter.path.replace(/^\$\.?/, '').split('.')
  let current: unknown = payload

  for (const part of pathParts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return filter.operator === 'exists' ? false : false
    }
    current = (current as Record<string, unknown>)[part]
  }

  switch (filter.operator) {
    case 'eq':
      return current === filter.value
    case 'neq':
      return current !== filter.value
    case 'gt':
      return typeof current === 'number' && current > (filter.value as number)
    case 'gte':
      return typeof current === 'number' && current >= (filter.value as number)
    case 'lt':
      return typeof current === 'number' && current < (filter.value as number)
    case 'lte':
      return typeof current === 'number' && current <= (filter.value as number)
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(current)
    case 'contains':
      return typeof current === 'string' && current.includes(filter.value as string)
    case 'exists':
      return current !== undefined && current !== null
    default:
      return true
  }
}

function matchesFilters(payload: unknown, filters?: EventFilter[]): boolean {
  if (!filters || filters.length === 0) return true
  return filters.every((f) => matchesFilter(payload, f))
}

// ──────────────────────────────────────────────────────────────
// EventBus — Singleton Class
// ──────────────────────────────────────────────────────────────

class EventBus {
  private handlers: Map<EventType, EventHandler[]> = new Map()
  private subscriptions: Map<string, EventSubscription> = new Map()
  private asyncQueue: Array<{ event: BaseEvent; handler: EventHandler }> = []
  private isProcessingAsync = false
  private emitCount = 0
  private errorCount = 0

  // ── Singleton Instance ──

  private static instance: EventBus | null = null

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus()
    }
    return EventBus.instance
  }

  static resetInstance(): void {
    EventBus.instance = null
  }

  private constructor() {
    // Private constructor enforces singleton
  }

  // ── Metrics ──

  getMetrics(): { emitCount: number; errorCount: number; handlerCount: number; subscriptionCount: number } {
    let handlerCount = 0
    for (const handlers of this.handlers.values()) {
      handlerCount += handlers.length
    }
    return {
      emitCount: this.emitCount,
      errorCount: this.errorCount,
      handlerCount,
      subscriptionCount: this.subscriptions.size,
    }
  }

  // ── Register Synchronous Handler ──

  on<T = unknown>(
    eventType: EventType,
    handler: (event: BaseEvent<T>) => Promise<HandlerResult>,
    options?: {
      id?: string
      priority?: number
      filter?: (event: BaseEvent<T>) => boolean
    }
  ): string {
    const handlerId = options?.id ?? `handler_${eventType}_${crypto.randomUUID().slice(0, 8)}`

    const eventHandler: EventHandler<T> = {
      id: handlerId,
      eventType,
      handler: handler as (event: BaseEvent<unknown>) => Promise<HandlerResult>,
      priority: options?.priority ?? 100,
      filter: options?.filter as ((event: BaseEvent<unknown>) => boolean) | undefined,
      channel: 'sync',
    }

    const existing = this.handlers.get(eventType) ?? []
    existing.push(eventHandler as EventHandler)
    existing.sort((a, b) => a.priority - b.priority)
    this.handlers.set(eventType, existing)

    return handlerId
  }

  // ── Register Async Handler (runs in background, non-blocking) ──

  onAsync<T = unknown>(
    eventType: EventType,
    handler: (event: BaseEvent<T>) => Promise<HandlerResult>,
    options?: {
      id?: string
      priority?: number
      filter?: (event: BaseEvent<T>) => boolean
    }
  ): string {
    const handlerId = options?.id ?? `async_handler_${eventType}_${crypto.randomUUID().slice(0, 8)}`

    const eventHandler: EventHandler<T> = {
      id: handlerId,
      eventType,
      handler: handler as (event: BaseEvent<unknown>) => Promise<HandlerResult>,
      priority: options?.priority ?? 100,
      filter: options?.filter as ((event: BaseEvent<unknown>) => boolean) | undefined,
      channel: 'async',
    }

    const existing = this.handlers.get(eventType) ?? []
    existing.push(eventHandler as EventHandler)
    existing.sort((a, b) => a.priority - b.priority)
    this.handlers.set(eventType, existing)

    return handlerId
  }

  // ── Unregister Handler ──

  off(eventType: EventType, handlerId: string): boolean {
    const existing = this.handlers.get(eventType)
    if (!existing) return false

    const index = existing.findIndex((h) => h.id === handlerId)
    if (index === -1) return false

    existing.splice(index, 1)
    if (existing.length === 0) {
      this.handlers.delete(eventType)
    } else {
      this.handlers.set(eventType, existing)
    }

    return true
  }

  // ── Create Persistent Subscription ──

  subscribe(subscription: Omit<EventSubscription, 'createdAt' | 'updatedAt'>): string {
    const now = new Date().toISOString()
    const sub: EventSubscription = {
      ...subscription,
      createdAt: now,
      updatedAt: now,
    }
    this.subscriptions.set(sub.id, sub)
    return sub.id
  }

  // ── Remove Subscription ──

  unsubscribe(subscriptionId: string): boolean {
    return this.subscriptions.delete(subscriptionId)
  }

  // ── Get All Subscriptions ──

  getSubscriptions(): EventSubscription[] {
    return Array.from(this.subscriptions.values())
  }

  // ── Get Handlers for Event Type ──

  getHandlers(eventType: EventType): EventHandler[] {
    return this.handlers.get(eventType) ?? []
  }

  // ── Core Emit — Process event through full pipeline ──

  async emit(event: BaseEvent): Promise<EmitResult> {
    const startTime = Date.now()
    this.emitCount++

    // ── Step 1: Validate Event Schema ──
    const validation = isValidEvent(event)
    if (!validation.valid) {
      this.errorCount++
      const errorResult: EmitResult = {
        eventId: event.id,
        handlerResults: [],
        durationMs: Date.now() - startTime,
        success: false,
        errors: [`Event validation failed: ${validation.errors.join('; ')}`],
      }
      return errorResult
    }

    // ── Step 2: Get Matching Handlers & Apply Filters ──
    const allHandlers = this.handlers.get(event.type) ?? []
    const syncHandlers = allHandlers.filter((h) => h.channel === 'sync')
    const asyncHandlers = allHandlers.filter((h) => h.channel === 'async')

    const filteredSyncHandlers = syncHandlers.filter((h) => {
      if (h.filter) {
        try {
          return h.filter(event)
        } catch {
          return false
        }
      }
      return true
    })

    // ── Step 3: Execute Sync Handlers by Priority (already sorted) ──
    const handlerResults: HandlerResult[] = []

    for (const handler of filteredSyncHandlers) {
      const handlerStart = Date.now()
      try {
        const result = await handler.handler(event)
        handlerResults.push({
          handlerId: handler.id,
          success: result.success,
          error: result.error,
          data: result.data,
          durationMs: Date.now() - handlerStart,
        })
      } catch (err) {
        // Error isolation: one handler failure must not block others
        const errorMessage = err instanceof Error ? err.message : 'Unknown handler error'
        handlerResults.push({
          handlerId: handler.id,
          success: false,
          error: errorMessage,
          durationMs: Date.now() - handlerStart,
        })
        this.errorCount++
      }
    }

    // ── Step 4: Queue Async Handlers (fire-and-forget) ──
    for (const handler of asyncHandlers) {
      if (handler.filter) {
        try {
          if (!handler.filter(event)) continue
        } catch {
          continue
        }
      }
      this.asyncQueue.push({ event, handler })
    }
    this.processAsyncQueue()

    // ── Step 5: Check Subscriptions and Dispatch ──
    this.dispatchToSubscribers(event)

    // ── Step 6: Persist to event_history table (Supabase) ──
    const totalDuration = Date.now() - startTime
    const allSuccess = handlerResults.every((r) => r.success)

    try {
      await this.persistEventHistory(event, handlerResults, totalDuration, allSuccess)
    } catch (err) {
      // Persistence failure should not block the pipeline
      const persistError = err instanceof Error ? err.message : 'Persistence error'
      handlerResults.push({
        handlerId: 'event_history_persist',
        success: false,
        error: persistError,
        durationMs: 0,
      })
      this.errorCount++
    }

    // ── Step 7: Fire Supabase Realtime for live updates ──
    try {
      await this.broadcastRealtime(event)
    } catch {
      // Realtime broadcast failure is non-critical
    }

    const errors = handlerResults
      .filter((r) => !r.success && r.error)
      .map((r) => `${r.handlerId}: ${r.error}`)

    return {
      eventId: event.id,
      handlerResults,
      durationMs: Date.now() - startTime,
      success: allSuccess,
      errors,
    }
  }

  // ── Process Async Queue (fire-and-forget, error-isolated) ──

  private processAsyncQueue(): void {
    if (this.isProcessingAsync) return
    this.isProcessingAsync = true

    // Process async handlers without awaiting — errors are caught internally
    const processNext = async (): Promise<void> => {
      while (this.asyncQueue.length > 0) {
        const item = this.asyncQueue.shift()
        if (!item) break

        try {
          await item.handler.handler(item.event)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Async handler error'
          console.error(`[EventBus] Async handler ${item.handler.id} failed: ${errorMessage}`)
          this.errorCount++
        }
      }
      this.isProcessingAsync = false
    }

    processNext().catch(() => {
      this.isProcessingAsync = false
    })
  }

  // ── Dispatch to Matching Subscribers ──

  private dispatchToSubscribers(event: BaseEvent): void {
    for (const subscription of this.subscriptions.values()) {
      if (!subscription.isActive) continue
      if (!subscription.eventTypes.includes(event.type)) continue

      // Apply subscription filters
      if (subscription.filters && !matchesFilters(event.payload, subscription.filters)) {
        continue
      }

      // Dispatch to each channel
      for (const channel of subscription.channels) {
        switch (channel) {
          case 'realtime':
            this.broadcastRealtime(event).catch(() => {})
            break
          case 'webhook':
            this.dispatchWebhook(event, subscription).catch(() => {})
            break
          case 'analytics':
            this.dispatchAnalytics(event).catch(() => {})
            break
          default:
            break
        }
      }
    }
  }

  // ── Persist Event to Supabase event_history ──

  private async persistEventHistory(
    event: BaseEvent,
    handlerResults: HandlerResult[],
    durationMs: number,
    success: boolean
  ): Promise<void> {
    const supabase = await createClient()

    const record = {
      event_id: event.id,
      event_type: event.type,
      timestamp: event.timestamp,
      source_user_id: event.source.userId,
      source_org_id: event.source.orgId ?? null,
      source_school_id: event.source.schoolId ?? null,
      payload: JSON.stringify(event.payload),
      correlation_id: event.metadata.correlationId,
      causation_id: event.metadata.causationId ?? null,
      version: event.metadata.version,
      handler_results: JSON.stringify(handlerResults),
      duration_ms: durationMs,
      success,
    }

    const { error } = await supabase.from('event_history').insert(record)

    if (error) {
      // If table doesn't exist yet, log but don't throw
      console.warn('[EventBus] Failed to persist event history:', error.message)
    }
  }

  // ── Broadcast via Supabase Realtime ──

  private async broadcastRealtime(event: BaseEvent): Promise<void> {
    const supabase = await createClient()

    // Insert into a realtime-enabled channel table that Supabase broadcasts
    const channel = supabase.channel('event-bus')

    channel.send({
      type: 'broadcast',
      event: event.type,
      payload: {
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        source: event.source,
        payload: event.payload,
        metadata: event.metadata,
      },
    })

    // Unsubscribe after sending to avoid memory leaks
    supabase.removeChannel(channel)
  }

  // ── Dispatch Webhook to Subscriber ──

  private async dispatchWebhook(event: BaseEvent, subscription: EventSubscription): Promise<void> {
    // Look up webhook URLs from the webhook_registrations table
    const supabase = await createClient()

    const { data: webhooks } = await supabase
      .from('webhook_registrations')
      .select('url, secret')
      .eq('subscriber_id', subscription.subscriberId)
      .eq('is_active', true)
      .contains('event_types', [event.type])

    if (!webhooks || webhooks.length === 0) return

    const body = JSON.stringify({
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      source: event.source,
      payload: event.payload,
      metadata: event.metadata,
    })

    for (const webhook of webhooks) {
      try {
        // Compute HMAC signature for webhook verification
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

        await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-EventBus-Signature': `sha256=${signature}`,
            'X-EventBus-Event-Type': event.type,
            'X-EventBus-Delivery-Id': crypto.randomUUID(),
          },
          body,
          signal: AbortSignal.timeout(10000), // 10s timeout
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Webhook dispatch error'
        console.error(`[EventBus] Webhook to ${webhook.url} failed: ${errorMessage}`)
        this.errorCount++
      }
    }
  }

  // ── Dispatch to Analytics Channel ──

  private async dispatchAnalytics(event: BaseEvent): Promise<void> {
    try {
      const supabase = await createClient()

      await supabase.from('analytics_events').insert({
        event_name: event.type,
        event_id: event.id,
        user_id: event.source.userId,
        school_id: event.source.schoolId ?? null,
        org_id: event.source.orgId ?? null,
        properties: JSON.stringify(event.payload),
        timestamp: event.timestamp,
        session_id: event.metadata.correlationId,
      })
    } catch {
      // Analytics dispatch failure is non-critical
    }
  }

  // ── Clear All Handlers and Subscriptions (for testing/reset) ──

  clear(): void {
    this.handlers.clear()
    this.subscriptions.clear()
    this.asyncQueue.length = 0
    this.emitCount = 0
    this.errorCount = 0
  }
}

// ──────────────────────────────────────────────────────────────
// Exported Singleton Access
// ──────────────────────────────────────────────────────────────

export const eventBus = EventBus.getInstance()

export { EventBus }

// ──────────────────────────────────────────────────────────────
// Helper: Create a well-formed event
// ──────────────────────────────────────────────────────────────

export function createEvent<T>(
  type: EventType,
  payload: T,
  source: { userId: string; orgId?: string | null; schoolId?: string | null; role?: string | null },
  options?: {
    correlationId?: string
    causationId?: string
    version?: number
    emittedBy?: string
  }
): BaseEvent<T> {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    source: {
      userId: source.userId,
      orgId: source.orgId ?? null,
      schoolId: source.schoolId ?? null,
      role: source.role ?? null,
    },
    payload,
    metadata: {
      correlationId: options?.correlationId ?? crypto.randomUUID(),
      causationId: options?.causationId ?? null,
      version: options?.version ?? 1,
      emittedBy: options?.emittedBy ?? 'event-bus',
      environment: process.env.NODE_ENV ?? 'development',
    },
  }
}
