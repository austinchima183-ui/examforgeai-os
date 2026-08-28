// ============================================================================
// ExamForge AI — Application Metrics
// ============================================================================
// In-memory metrics store for tracking API latency, DB latency, AI latency,
// AI cost, auth failures, rate limit events, webhook failures, security
// events, and job failures. No external dependency required.
//
// Usage:
//   recordMetric(MetricNames.API_LATENCY, 45, { method: 'GET', route: '/api/exams' })
//   getMetrics()           → all raw metric data points
//   getMetricSummary()     → aggregated summaries with p50/p95/p99/count/sum
// ============================================================================

import { createLogger } from './logger'

const log = createLogger('metrics')

// ──────────────────────────────────────────────────────────────
// Metric Name Constants
// ──────────────────────────────────────────────────────────────

/**
 * Canonical metric names for consistency across the application.
 * Always use these constants instead of raw strings.
 */
export const MetricNames = {
  // Latency metrics (value = milliseconds)
  API_LATENCY: 'api.latency',
  DB_LATENCY: 'db.latency',
  AI_LATENCY: 'ai.latency',
  AI_STREAM_TTFB: 'ai.stream.ttfb',       // Time to first byte for AI streaming

  // Cost metrics (value = USD cents)
  AI_COST: 'ai.cost',
  AI_TOKENS_INPUT: 'ai.tokens.input',
  AI_TOKENS_OUTPUT: 'ai.tokens.output',

  // Failure/counter metrics (value = 1 per event)
  AUTH_FAILURE: 'auth.failure',
  AUTH_SUCCESS: 'auth.success',
  RATE_LIMIT_TRIGGER: 'rate_limit.trigger',
  WEBHOOK_FAILURE: 'webhook.failure',
  WEBHOOK_SUCCESS: 'webhook.success',
  SECURITY_EVENT: 'security.event',
  JOB_FAILURE: 'job.failure',
  JOB_SUCCESS: 'job.success',

  // Error tracking
  ERROR_RATE: 'error.rate',
  API_ERROR: 'api.error',
  DB_ERROR: 'db.error',
  AI_ERROR: 'ai.error',

  // Business metrics
  EXAM_CREATED: 'exam.created',
  EXAM_COMPLETED: 'exam.completed',
  QUESTION_GENERATED: 'question.generated',
  STUDENT_ACTIVE: 'student.active',
  ORGANIZATION_ACTIVE: 'organization.active',

  // Resource metrics
  MEMORY_USAGE_MB: 'resource.memory_mb',
  CPU_USAGE_PERCENT: 'resource.cpu_percent',
  ACTIVE_CONNECTIONS: 'resource.active_connections',
} as const

export type MetricName = typeof MetricNames[keyof typeof MetricNames]

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface MetricTag {
  [key: string]: string | number | boolean
}

export interface MetricDataPoint {
  name: string
  value: number
  tags: MetricTag
  timestamp: number
}

export interface MetricSummary {
  name: string
  count: number
  sum: number
  min: number
  max: number
  avg: number
  p50: number
  p95: number
  p99: number
  last5min: {
    count: number
    avg: number
    sum: number
  }
  last1hour: {
    count: number
    avg: number
    sum: number
  }
}

// ──────────────────────────────────────────────────────────────
// In-Memory Metrics Store
// ──────────────────────────────────────────────────────────────

/** Maximum data points per metric name before eviction */
const MAX_DATA_POINTS_PER_METRIC = 10_000

/** All recorded metric data points, keyed by metric name */
const metricsStore: Map<string, MetricDataPoint[]> = new Map()

/** Start time for computing rates */
const storeStartTime = Date.now()

/**
 * Record a metric value with optional tags.
 *
 * @param name - Metric name (use MetricNames constants)
 * @param value - Numeric value (latency in ms, cost in cents, count as 1)
 * @param tags - Optional key-value tags for filtering/grouping
 *
 * @example
 * ```ts
 * recordMetric(MetricNames.API_LATENCY, 45, { method: 'GET', route: '/api/exams' })
 * recordMetric(MetricNames.AUTH_FAILURE, 1, { provider: 'credentials', reason: 'invalid_password' })
 * recordMetric(MetricNames.AI_COST, 2, { provider: 'openai', model: 'gpt-4' })
 * ```
 */
export function recordMetric(
  name: string,
  value: number,
  tags: MetricTag = {}
): void {
  const point: MetricDataPoint = {
    name,
    value,
    tags,
    timestamp: Date.now(),
  }

  let points = metricsStore.get(name)
  if (!points) {
    points = []
    metricsStore.set(name, points)
  }

  points.push(point)

  // Evict oldest data points if we exceed the per-metric limit
  if (points.length > MAX_DATA_POINTS_PER_METRIC) {
    points.splice(0, points.length - MAX_DATA_POINTS_PER_METRIC)
  }
}

/**
 * Record a latency metric with start time.
 * Convenience wrapper that computes elapsed time from a start timestamp.
 *
 * @param name - Metric name
 * @param startTime - The start time (from Date.now())
 * @param tags - Optional tags
 * @returns The elapsed time in ms
 */
export function recordLatency(
  name: string,
  startTime: number,
  tags: MetricTag = {}
): number {
  const elapsed = Date.now() - startTime
  recordMetric(name, elapsed, tags)
  return elapsed
}

/**
 * Increment a counter metric by 1.
 * Convenience wrapper for counting events.
 *
 * @param name - Metric name
 * @param tags - Optional tags
 */
export function incrementCounter(
  name: string,
  tags: MetricTag = {}
): void {
  recordMetric(name, 1, tags)
}

// ──────────────────────────────────────────────────────────────
// Query: Get Raw Metrics
// ──────────────────────────────────────────────────────────────

/**
 * Get all recorded metrics, optionally filtered by name pattern and time range.
 *
 * @param options - Filter options
 * @returns Array of matching metric data points
 */
export function getMetrics(options?: {
  namePrefix?: string
  since?: number  // Unix timestamp in ms
  limit?: number
}): MetricDataPoint[] {
  const { namePrefix, since, limit } = options ?? {}

  let results: MetricDataPoint[] = []

  for (const [name, points] of Array.from(metricsStore.entries())) {
    if (namePrefix && !name.startsWith(namePrefix)) continue

    const filtered = since
      ? points.filter(p => p.timestamp >= since)
      : points

    results.push(...filtered)
  }

  // Sort by timestamp descending
  results.sort((a, b) => b.timestamp - a.timestamp)

  if (limit && limit > 0) {
    results = results.slice(0, limit)
  }

  return results
}

// ──────────────────────────────────────────────────────────────
// Query: Get Metric Summary
// ──────────────────────────────────────────────────────────────

/**
 * Compute percentile from a sorted array of numbers.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil(sorted.length * p / 100) - 1
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))]
}

/**
 * Get a summary of all metrics with statistical aggregations.
 * Includes count, sum, min, max, avg, p50, p95, p99, and
 * time-windowed summaries (last 5 min, last 1 hour).
 *
 * @param nameFilter - Optional: only include metrics whose name starts with this prefix
 * @returns Array of metric summaries
 */
export function getMetricSummary(nameFilter?: string): MetricSummary[] {
  const now = Date.now()
  const fiveMinutesAgo = now - 5 * 60 * 1000
  const oneHourAgo = now - 60 * 60 * 1000

  const summaries: MetricSummary[] = []

  for (const [name, points] of Array.from(metricsStore.entries())) {
    if (nameFilter && !name.startsWith(nameFilter)) continue
    if (points.length === 0) continue

    const values = points.map(p => p.value).sort((a, b) => a - b)
    const count = values.length
    const sum = values.reduce((acc, v) => acc + v, 0)
    const min = values[0]
    const max = values[count - 1]
    const avg = count > 0 ? sum / count : 0

    // Time-windowed summaries
    const last5minPoints = points.filter(p => p.timestamp >= fiveMinutesAgo)
    const last1hourPoints = points.filter(p => p.timestamp >= oneHourAgo)

    const last5minValues = last5minPoints.map(p => p.value)
    const last5minCount = last5minValues.length
    const last5minSum = last5minValues.reduce((acc, v) => acc + v, 0)

    const last1hourValues = last1hourPoints.map(p => p.value)
    const last1hourCount = last1hourValues.length
    const last1hourSum = last1hourValues.reduce((acc, v) => acc + v, 0)

    summaries.push({
      name,
      count,
      sum,
      min,
      max,
      avg,
      p50: percentile(values, 50),
      p95: percentile(values, 95),
      p99: percentile(values, 99),
      last5min: {
        count: last5minCount,
        avg: last5minCount > 0 ? last5minSum / last5minCount : 0,
        sum: last5minSum,
      },
      last1hour: {
        count: last1hourCount,
        avg: last1hourCount > 0 ? last1hourSum / last1hourCount : 0,
        sum: last1hourSum,
      },
    })
  }

  return summaries
}

// ──────────────────────────────────────────────────────────────
// Query: Rate Calculations
// ──────────────────────────────────────────────────────────────

/**
 * Get the rate of a counter metric (events per minute) over a time window.
 *
 * @param name - Metric name
 * @param windowMinutes - Time window in minutes (default: 5)
 * @returns Events per minute, or 0 if no data
 */
export function getMetricRate(name: string, windowMinutes: number = 5): number {
  const points = metricsStore.get(name)
  if (!points || points.length === 0) return 0

  const cutoff = Date.now() - windowMinutes * 60 * 1000
  const recentPoints = points.filter(p => p.timestamp >= cutoff)
  return recentPoints.length / windowMinutes
}

/**
 * Get the error rate as a percentage for a given metric category.
 * Compares error events to total events (errors + successes).
 *
 * @param errorMetricName - Name of the error counter metric
 * @param successMetricName - Name of the success counter metric
 * @param windowMinutes - Time window in minutes (default: 5)
 * @returns Error rate as a percentage (0-100)
 */
export function getErrorRate(
  errorMetricName: string,
  successMetricName: string,
  windowMinutes: number = 5
): number {
  const cutoff = Date.now() - windowMinutes * 60 * 1000

  const errorPoints = (metricsStore.get(errorMetricName) ?? [])
    .filter(p => p.timestamp >= cutoff)
  const successPoints = (metricsStore.get(successMetricName) ?? [])
    .filter(p => p.timestamp >= cutoff)

  const total = errorPoints.length + successPoints.length
  if (total === 0) return 0

  return (errorPoints.length / total) * 100
}

// ──────────────────────────────────────────────────────────────
// Reset (for testing)
// ──────────────────────────────────────────────────────────────

/**
 * Clear all stored metrics. Primarily for testing.
 */
export function resetMetrics(): void {
  metricsStore.clear()
}

/**
 * Get the store start time.
 */
export function getStoreStartTime(): number {
  return storeStartTime
}

/**
 * Get the total number of stored data points.
 */
export function getTotalDataPoints(): number {
  let total = 0
  for (const points of Array.from(metricsStore.values())) {
    total += points.length
  }
  return total
}

// ──────────────────────────────────────────────────────────────
// Periodic Logging (optional — call once at startup)
// ──────────────────────────────────────────────────────────────

let metricsLogInterval: ReturnType<typeof setInterval> | null = null

/**
 * Start periodic logging of metric summaries.
 * Only runs in production or when METRICS_LOG_INTERVAL is set.
 *
 * @param intervalMs - Interval in milliseconds (default: 60000 = 1 min)
 */
export function startMetricsLogging(intervalMs: number = 60_000): void {
  if (metricsLogInterval) return // Already started

  const shouldLog = process.env.NODE_ENV === 'production' || process.env.METRICS_LOG_INTERVAL
  if (!shouldLog) return

  metricsLogInterval = setInterval(() => {
    const summary = getMetricSummary()
    if (summary.length > 0) {
      log.info('Metrics summary', {
        metricCount: summary.length,
        totalDataPoints: getTotalDataPoints(),
        topLatency: summary
          .filter(s => s.name.includes('latency'))
          .sort((a, b) => b.p95 - a.p95)
          .slice(0, 5)
          .map(s => ({ name: s.name, p95: s.p95, count: s.count })),
      })
    }
  }, intervalMs)

  // Don't prevent process exit
  if (metricsLogInterval && typeof metricsLogInterval === 'object' && 'unref' in metricsLogInterval) {
    metricsLogInterval.unref()
  }
}

/**
 * Stop periodic metrics logging.
 */
export function stopMetricsLogging(): void {
  if (metricsLogInterval) {
    clearInterval(metricsLogInterval)
    metricsLogInterval = null
  }
}
