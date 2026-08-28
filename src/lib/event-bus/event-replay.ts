// ============================================================================
// ExamForge AI — Event Replay & History System
// ============================================================================
// Event replay for debugging, recovery, and auditing:
// - replayEvents: Re-emit historical events through the pipeline
// - getEventHistory: Query event history with filters and pagination
// - getEventTimeline: Get all events for a specific entity
// - getCorrelationEvents: Trace a request through multiple events
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { eventBus, createEvent } from './event-emitter'
import { EventType } from './types'
import type {
  BaseEvent,
  EmitResult,
  EventHistory,
  EventHistoryFilters,
  ReplayConfig,
  HandlerResult,
} from './types'

// ──────────────────────────────────────────────────────────────
// Event History Row from Supabase
// ──────────────────────────────────────────────────────────────

interface EventHistoryRow {
  event_id: string
  event_type: string
  timestamp: string
  source_user_id: string
  source_org_id: string | null
  source_school_id: string | null
  payload: string
  correlation_id: string
  causation_id: string | null
  version: number
  handler_results: string
  duration_ms: number
  success: boolean
  created_at?: string
}

// ──────────────────────────────────────────────────────────────
// Convert DB Row to EventHistory Interface
// ──────────────────────────────────────────────────────────────

function rowToEventHistory(row: EventHistoryRow): EventHistory {
  return {
    eventId: row.event_id,
    eventType: row.event_type as EventType,
    timestamp: row.timestamp,
    sourceUserId: row.source_user_id,
    sourceOrgId: row.source_org_id,
    sourceSchoolId: row.source_school_id,
    payload: row.payload,
    correlationId: row.correlation_id,
    causationId: row.causation_id,
    version: row.version,
    handlerResults: row.handler_results,
    durationMs: row.duration_ms,
    success: row.success,
  }
}

// ──────────────────────────────────────────────────────────────
// Reconstruct BaseEvent from EventHistory
// ──────────────────────────────────────────────────────────────

function historyToEvent(history: EventHistory): BaseEvent {
  let parsedPayload: unknown
  try {
    parsedPayload = JSON.parse(history.payload)
  } catch {
    parsedPayload = { raw: history.payload }
  }

  return {
    id: history.eventId,
    type: history.eventType,
    timestamp: history.timestamp,
    source: {
      userId: history.sourceUserId,
      orgId: history.sourceOrgId,
      schoolId: history.sourceSchoolId,
    },
    payload: parsedPayload,
    metadata: {
      correlationId: history.correlationId,
      causationId: history.causationId,
      version: history.version,
      emittedBy: 'event-replay',
      environment: process.env.NODE_ENV ?? 'development',
    },
  }
}

// ──────────────────────────────────────────────────────────────
// Get Event History — Query with filters and pagination
// ──────────────────────────────────────────────────────────────

export async function getEventHistory(
  filters: EventHistoryFilters = {}
): Promise<{ events: EventHistory[]; total: number; hasMore: boolean }> {
  const supabase = await createClient()

  const limit = Math.min(filters.limit ?? 50, 500)
  const offset = filters.offset ?? 0

  // Build query with count
  let query = supabase
    .from('event_history')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false })

  // Apply filters
  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType)
  }
  if (filters.eventTypes && filters.eventTypes.length > 0) {
    query = query.in('event_type', filters.eventTypes)
  }
  if (filters.sourceUserId) {
    query = query.eq('source_user_id', filters.sourceUserId)
  }
  if (filters.sourceSchoolId) {
    query = query.eq('source_school_id', filters.sourceSchoolId)
  }
  if (filters.sourceOrgId) {
    query = query.eq('source_org_id', filters.sourceOrgId)
  }
  if (filters.correlationId) {
    query = query.eq('correlation_id', filters.correlationId)
  }
  if (filters.causationId) {
    query = query.eq('causation_id', filters.causationId)
  }
  if (filters.fromTimestamp) {
    query = query.gte('timestamp', filters.fromTimestamp)
  }
  if (filters.toTimestamp) {
    query = query.lte('timestamp', filters.toTimestamp)
  }
  if (filters.successOnly) {
    query = query.eq('success', true)
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    console.error('[EventReplay] Failed to query event_history:', error.message)
    return { events: [], total: 0, hasMore: false }
  }

  const events = (data as EventHistoryRow[] ?? []).map(rowToEventHistory)
  const total = count ?? 0
  const hasMore = offset + events.length < total

  return { events, total, hasMore }
}

// ──────────────────────────────────────────────────────────────
// Get Event Timeline — All events for a specific entity
// ──────────────────────────────────────────────────────────────

export async function getEventTimeline(
  entityId: string,
  options?: {
    limit?: number
    offset?: number
    fromTimestamp?: string
    toTimestamp?: string
  }
): Promise<{ events: EventHistory[]; total: number; hasMore: boolean }> {
  const supabase = await createClient()

  const limit = Math.min(options?.limit ?? 100, 500)
  const offset = options?.offset ?? 0

  // Search for the entity ID in:
  // 1. source_user_id (user-centric timeline)
  // 2. correlation_id (correlation-centric timeline)
  // 3. payload text search (entity ID in any payload field)
  let query = supabase
    .from('event_history')
    .select('*', { count: 'exact' })
    .or(`source_user_id.eq.${entityId},correlation_id.eq.${entityId}`)
    .order('timestamp', { ascending: false })

  if (options?.fromTimestamp) {
    query = query.gte('timestamp', options.fromTimestamp)
  }
  if (options?.toTimestamp) {
    query = query.lte('timestamp', options.toTimestamp)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error) {
    // Fallback: try payload text search if direct columns fail
    console.warn('[EventReplay] Direct query failed, trying payload search:', error.message)

    const fallbackQuery = supabase
      .from('event_history')
      .select('*', { count: 'exact' })
      .ilike('payload', `%${entityId}%`)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    const fallbackResult = await fallbackQuery
    const fallbackEvents = (fallbackResult.data as EventHistoryRow[] ?? []).map(rowToEventHistory)
    const fallbackTotal = fallbackResult.count ?? 0

    return {
      events: fallbackEvents,
      total: fallbackTotal,
      hasMore: offset + fallbackEvents.length < fallbackTotal,
    }
  }

  const events = (data as EventHistoryRow[] ?? []).map(rowToEventHistory)
  const total = count ?? 0

  // Also search payload for entity ID references not captured by source_user_id
  const payloadQuery = supabase
    .from('event_history')
    .select('*', { count: 'exact' })
    .ilike('payload', `%${entityId}%`)
    .neq('source_user_id', entityId) // Exclude already fetched
    .order('timestamp', { ascending: false })

  if (options?.fromTimestamp) {
    void payloadQuery.gte('timestamp', options.fromTimestamp)
  }
  if (options?.toTimestamp) {
    void payloadQuery.lte('timestamp', options.toTimestamp)
  }

  const { data: payloadData, count: payloadCount } = await payloadQuery.limit(limit)

  const payloadEvents = (payloadData as EventHistoryRow[] ?? []).map(rowToEventHistory)

  // Merge and deduplicate
  const seenIds = new Set(events.map((e) => e.eventId))
  for (const pe of payloadEvents) {
    if (!seenIds.has(pe.eventId)) {
      events.push(pe)
      seenIds.add(pe.eventId)
    }
  }

  // Sort merged results
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const mergedTotal = total + (payloadCount ?? 0)
  const hasMore = offset + events.length < mergedTotal

  return { events: events.slice(0, limit), total: mergedTotal, hasMore }
}

// ──────────────────────────────────────────────────────────────
// Get Correlation Events — Trace a request through multiple events
// ──────────────────────────────────────────────────────────────

export async function getCorrelationEvents(
  correlationId: string,
  options?: {
    includeCausation?: boolean
    limit?: number
  }
): Promise<{ events: EventHistory[]; chainDepth: number }> {
  const supabase = await createClient()
  const limit = Math.min(options?.limit ?? 200, 1000)
  const includeCausation = options?.includeCausation ?? true

  // Step 1: Get all events with this correlation ID
  const { data: correlationData, error } = await supabase
    .from('event_history')
    .select('*')
    .eq('correlation_id', correlationId)
    .order('timestamp', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[EventReplay] Failed to query correlation events:', error.message)
    return { events: [], chainDepth: 0 }
  }

  const events = (correlationData as EventHistoryRow[] ?? []).map(rowToEventHistory)

  // Step 2: If includeCausation, walk the causation chain
  if (includeCausation && events.length > 0) {
    const visitedIds = new Set(events.map((e) => e.eventId))
    let chainDepth = 0
    const maxChainDepth = 20 // Prevent infinite loops

    // Follow causation chains from the first event
    let currentCausationId = events[0].causationId
    while (currentCausationId && chainDepth < maxChainDepth) {
      // Find events where event_id = causationId (the causing event)
      const { data: causingEvents } = await supabase
        .from('event_history')
        .select('*')
        .eq('event_id', currentCausationId)
        .limit(1)

      if (!causingEvents || causingEvents.length === 0) break

      const causingEvent = rowToEventHistory(causingEvents[0] as EventHistoryRow)

      if (visitedIds.has(causingEvent.eventId)) break
      visitedIds.add(causingEvent.eventId)

      events.unshift(causingEvent) // Prepend to maintain chronological order
      currentCausationId = causingEvent.causationId
      chainDepth++
    }

    // Also follow forward: events caused by any event in this correlation
    for (const event of [...events]) {
      const { data: causedEvents } = await supabase
        .from('event_history')
        .select('*')
        .eq('causation_id', event.eventId)
        .neq('correlation_id', correlationId) // Different correlation = different flow
        .order('timestamp', { ascending: true })
        .limit(10)

      if (causedEvents) {
        for (const causedRow of causedEvents as EventHistoryRow[]) {
          const causedEvent = rowToEventHistory(causedRow)
          if (!visitedIds.has(causedEvent.eventId)) {
            visitedIds.add(causedEvent.eventId)
            events.push(causedEvent)
          }
        }
      }
    }

    // Re-sort chronologically
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return { events: events.slice(0, limit), chainDepth: chainDepth + 1 }
  }

  return { events, chainDepth: 1 }
}

// ──────────────────────────────────────────────────────────────
// Replay Events — Re-emit historical events through the pipeline
// ──────────────────────────────────────────────────────────────

export interface ReplayResult {
  totalEvents: number
  replayedEvents: number
  skippedEvents: number
  failedEvents: number
  results: Array<{
    eventId: string
    eventType: EventType
    success: boolean
    error?: string
    durationMs: number
  }>
  totalDurationMs: number
}

export async function replayEvents(
  config: ReplayConfig
): Promise<ReplayResult> {
  const startTime = Date.now()
  const supabase = await createClient()

  const limit = Math.min(config.limit ?? 100, 1000)

  // Step 1: Query historical events in the time range
  let query = supabase
    .from('event_history')
    .select('*')
    .gte('timestamp', config.from)
    .lte('timestamp', config.to)
    .order('timestamp', { ascending: true })
    .limit(limit)

  if (config.eventTypes && config.eventTypes.length > 0) {
    query = query.in('event_type', config.eventTypes)
  }
  if (config.correlationId) {
    query = query.eq('correlation_id', config.correlationId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[EventReplay] Failed to query events for replay:', error.message)
    return {
      totalEvents: 0,
      replayedEvents: 0,
      skippedEvents: 0,
      failedEvents: 0,
      results: [],
      totalDurationMs: Date.now() - startTime,
    }
  }

  const historicalEvents = (data as EventHistoryRow[] ?? []).map(rowToEventHistory)

  if (historicalEvents.length === 0) {
    return {
      totalEvents: 0,
      replayedEvents: 0,
      skippedEvents: 0,
      failedEvents: 0,
      results: [],
      totalDurationMs: Date.now() - startTime,
    }
  }

  // Step 2: Reconstruct events and re-emit them
  const results: ReplayResult['results'] = []
  let replayedEvents = 0
  let skippedEvents = 0
  let failedEvents = 0

  for (const historyItem of historicalEvents) {
    // Skip failed events unless explicitly requested
    if (!historyItem.success) {
      skippedEvents++
      results.push({
        eventId: historyItem.eventId,
        eventType: historyItem.eventType,
        success: false,
        error: 'Original event was unsuccessful, skipping replay',
        durationMs: 0,
      })
      continue
    }

    try {
      // Reconstruct the event with a new ID but preserving correlation
      const reconstructedEvent = createEvent(
        historyItem.eventType,
        JSON.parse(historyItem.payload),
        {
          userId: historyItem.sourceUserId,
          orgId: historyItem.sourceOrgId,
          schoolId: historyItem.sourceSchoolId,
        },
        {
          correlationId: historyItem.correlationId,
          causationId: historyItem.eventId, // Original event ID as causation
          version: historyItem.version,
          emittedBy: 'event-replay',
        }
      )

      if (config.dryRun) {
        // Dry run: don't actually emit, just validate
        results.push({
          eventId: reconstructedEvent.id,
          eventType: historyItem.eventType,
          success: true,
          durationMs: 0,
        })
        replayedEvents++
      } else {
        // Emit the reconstructed event through the full pipeline
        const emitResult: EmitResult = await eventBus.emit(reconstructedEvent)

        results.push({
          eventId: reconstructedEvent.id,
          eventType: historyItem.eventType,
          success: emitResult.success,
          error: emitResult.errors.length > 0 ? emitResult.errors.join('; ') : undefined,
          durationMs: emitResult.durationMs,
        })

        if (emitResult.success) {
          replayedEvents++
        } else {
          failedEvents++
        }
      }
    } catch (err) {
      failedEvents++
      results.push({
        eventId: historyItem.eventId,
        eventType: historyItem.eventType,
        success: false,
        error: err instanceof Error ? err.message : 'Replay error',
        durationMs: 0,
      })
    }
  }

  return {
    totalEvents: historicalEvents.length,
    replayedEvents,
    skippedEvents,
    failedEvents,
    results,
    totalDurationMs: Date.now() - startTime,
  }
}

// ──────────────────────────────────────────────────────────────
// Replay Single Event — Re-emit a single event by ID
// ──────────────────────────────────────────────────────────────

export async function replaySingleEvent(
  eventId: string,
  options?: { dryRun?: boolean }
): Promise<EmitResult | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('event_history')
    .select('*')
    .eq('event_id', eventId)
    .limit(1)
    .single()

  if (error || !data) {
    console.error('[EventReplay] Event not found:', eventId, error?.message)
    return null
  }

  const historyItem = rowToEventHistory(data as EventHistoryRow)

  const reconstructedEvent = createEvent(
    historyItem.eventType,
    JSON.parse(historyItem.payload),
    {
      userId: historyItem.sourceUserId,
      orgId: historyItem.sourceOrgId,
      schoolId: historyItem.sourceSchoolId,
    },
    {
      correlationId: historyItem.correlationId,
      causationId: historyItem.eventId,
      version: historyItem.version,
      emittedBy: 'event-replay',
    }
  )

  if (options?.dryRun) {
    // Return a synthetic success result without emitting
    return {
      eventId: reconstructedEvent.id,
      handlerResults: [],
      durationMs: 0,
      success: true,
      errors: [],
    }
  }

  return eventBus.emit(reconstructedEvent)
}

// ──────────────────────────────────────────────────────────────
// Get Event Statistics — Aggregated stats for monitoring
// ──────────────────────────────────────────────────────────────

export interface EventStatistics {
  totalEvents: number
  eventsByType: Record<string, number>
  eventsByHour: Record<string, number>
  avgDurationMs: number
  errorRate: number
  topUsers: Array<{ userId: string; eventCount: number }>
}

export async function getEventStatistics(
  options?: {
    fromTimestamp?: string
    toTimestamp?: string
    schoolId?: string
  }
): Promise<EventStatistics> {
  const supabase = await createClient()

  let query = supabase
    .from('event_history')
    .select('event_type, duration_ms, success, source_user_id, timestamp')

  if (options?.fromTimestamp) {
    query = query.gte('timestamp', options.fromTimestamp)
  }
  if (options?.toTimestamp) {
    query = query.lte('timestamp', options.toTimestamp)
  }
  if (options?.schoolId) {
    query = query.eq('source_school_id', options.schoolId)
  }

  const { data, error } = await query

  if (error || !data) {
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsByHour: {},
      avgDurationMs: 0,
      errorRate: 0,
      topUsers: [],
    }
  }

  const rows = data as Array<{
    event_type: string
    duration_ms: number
    success: boolean
    source_user_id: string
    timestamp: string
  }>

  const totalEvents = rows.length
  const eventsByType: Record<string, number> = {}
  const eventsByHour: Record<string, number> = {}
  const userCounts: Record<string, number> = {}
  let totalDuration = 0
  let errorCount = 0

  for (const row of rows) {
    // By type
    eventsByType[row.event_type] = (eventsByType[row.event_type] ?? 0) + 1

    // By hour
    const hour = row.timestamp.slice(0, 13) // "2025-01-15T10"
    eventsByHour[hour] = (eventsByHour[hour] ?? 0) + 1

    // Duration
    totalDuration += row.duration_ms ?? 0

    // Error count
    if (!row.success) errorCount++

    // User counts
    userCounts[row.source_user_id] = (userCounts[row.source_user_id] ?? 0) + 1
  }

  // Top users (top 10 by event count)
  const topUsers = Object.entries(userCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([userId, eventCount]) => ({ userId, eventCount }))

  return {
    totalEvents,
    eventsByType,
    eventsByHour,
    avgDurationMs: totalEvents > 0 ? Math.round(totalDuration / totalEvents) : 0,
    errorRate: totalEvents > 0 ? errorCount / totalEvents : 0,
    topUsers,
  }
}
