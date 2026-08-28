// ============================================================================
// ExamForge AI — Alert Rules & Threshold Monitoring
// ============================================================================
// Evaluates current metrics against defined alert thresholds.
// - checkAlerts() returns list of active alerts with severity & recommended action
// - Alert thresholds: error rate > 5%, AI failure rate > 10%, DB latency p95 > 500ms,
//   auth failures > 20/min, rate limit triggers > 100/min
// - Alerts are logged via the structured logger when they trigger
// ============================================================================

import {
  MetricNames,
  getMetricSummary,
  getMetricRate,
  getErrorRate,
} from './metrics'
import { createLogger } from './logger'

const log = createLogger('alerts')

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface AlertRule {
  id: string
  name: string
  description: string
  severity: AlertSeverity
  /** The threshold value that triggers the alert */
  threshold: number
  /** The unit of measurement (e.g., 'percent', 'ms', 'events/min') */
  unit: string
  /** The current value when the alert is active */
  currentValue?: number
  /** Whether the alert is currently firing */
  active: boolean
  /** Recommended action to resolve the alert */
  recommendedAction: string
  /** Time the alert was last triggered */
  lastTriggeredAt?: number
}

export interface AlertResult {
  alerts: AlertRule[]
  /** Overall system health based on active alerts */
  health: 'healthy' | 'degraded' | 'critical'
  /** Timestamp of the check */
  checkedAt: string
  /** Number of active alerts by severity */
  summary: {
    critical: number
    warning: number
    info: number
    total: number
  }
}

// ──────────────────────────────────────────────────────────────
// Alert Threshold Definitions
// ──────────────────────────────────────────────────────────────

interface ThresholdConfig {
  errorRatePercent: number       // Error rate > 5%
  aiFailureRatePercent: number   // AI failure rate > 10%
  dbLatencyP95Ms: number         // DB latency p95 > 500ms
  apiLatencyP95Ms: number        // API latency p95 > 2000ms
  authFailuresPerMin: number     // Auth failures > 20/min
  rateLimitPerMin: number        // Rate limit triggers > 100/min
  securityEventsPerMin: number   // Security events > 10/min
  webhookFailureRate: number     // Webhook failure rate > 30%
  jobFailureRate: number         // Job failure rate > 15%
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  errorRatePercent: 5,
  aiFailureRatePercent: 10,
  dbLatencyP95Ms: 500,
  apiLatencyP95Ms: 2000,
  authFailuresPerMin: 20,
  rateLimitPerMin: 100,
  securityEventsPerMin: 10,
  webhookFailureRate: 30,
  jobFailureRate: 15,
}

/**
 * Load thresholds from environment variables with fallbacks to defaults.
 * Allows operational teams to tune thresholds without code changes.
 */
function loadThresholds(): ThresholdConfig {
  return {
    errorRatePercent: envNum('ALERT_ERROR_RATE_PERCENT', DEFAULT_THRESHOLDS.errorRatePercent),
    aiFailureRatePercent: envNum('ALERT_AI_FAILURE_RATE_PERCENT', DEFAULT_THRESHOLDS.aiFailureRatePercent),
    dbLatencyP95Ms: envNum('ALERT_DB_LATENCY_P95_MS', DEFAULT_THRESHOLDS.dbLatencyP95Ms),
    apiLatencyP95Ms: envNum('ALERT_API_LATENCY_P95_MS', DEFAULT_THRESHOLDS.apiLatencyP95Ms),
    authFailuresPerMin: envNum('ALERT_AUTH_FAILURES_PER_MIN', DEFAULT_THRESHOLDS.authFailuresPerMin),
    rateLimitPerMin: envNum('ALERT_RATE_LIMIT_PER_MIN', DEFAULT_THRESHOLDS.rateLimitPerMin),
    securityEventsPerMin: envNum('ALERT_SECURITY_EVENTS_PER_MIN', DEFAULT_THRESHOLDS.securityEventsPerMin),
    webhookFailureRate: envNum('ALERT_WEBHOOK_FAILURE_RATE', DEFAULT_THRESHOLDS.webhookFailureRate),
    jobFailureRate: envNum('ALERT_JOB_FAILURE_RATE', DEFAULT_THRESHOLDS.jobFailureRate),
  }
}

function envNum(key: string, fallback: number): number {
  const val = process.env[key]
  if (!val) return fallback
  const parsed = Number(val)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// ──────────────────────────────────────────────────────────────
// Alert State Tracking (prevent log spam)
// ──────────────────────────────────────────────────────────────

const alertState: Map<string, { active: boolean; lastTriggeredAt: number; lastLoggedAt: number }> = new Map()

/** Minimum interval between repeated alert log messages (5 minutes) */
const ALERT_LOG_THROTTLE_MS = 5 * 60 * 1000

// ──────────────────────────────────────────────────────────────
// Alert Rule Definitions
// ──────────────────────────────────────────────────────────────

/**
 * Define all alert rules. Each rule evaluates current metrics
 * against its threshold and returns an AlertRule with active status.
 */
function evaluateAlertRules(thresholds: ThresholdConfig): AlertRule[] {
  const now = Date.now()
  const summary = getMetricSummary()

  // Helper to find a metric summary by name
  const findSummary = (name: string) => summary.find(s => s.name === name)

  // ── 1. Error Rate Alert ──
  const errorRate = getErrorRate(MetricNames.API_ERROR, MetricNames.API_LATENCY, 5)
  const errorRateAlert: AlertRule = {
    id: 'error-rate-high',
    name: 'API Error Rate',
    description: `API error rate exceeds ${thresholds.errorRatePercent}% threshold`,
    severity: 'critical',
    threshold: thresholds.errorRatePercent,
    unit: 'percent',
    currentValue: Math.round(errorRate * 100) / 100,
    active: errorRate > thresholds.errorRatePercent,
    recommendedAction: 'Investigate recent API errors. Check Sentry for error details. Review recent deployments for regressions.',
  }

  // ── 2. AI Failure Rate Alert ──
  const aiErrorRate = getErrorRate(MetricNames.AI_ERROR, MetricNames.AI_LATENCY, 5)
  const aiFailureAlert: AlertRule = {
    id: 'ai-failure-rate-high',
    name: 'AI Provider Failure Rate',
    description: `AI provider failure rate exceeds ${thresholds.aiFailureRatePercent}% threshold`,
    severity: 'critical',
    threshold: thresholds.aiFailureRatePercent,
    unit: 'percent',
    currentValue: Math.round(aiErrorRate * 100) / 100,
    active: aiErrorRate > thresholds.aiFailureRatePercent,
    recommendedAction: 'Check AI provider status pages. Verify API keys and quotas. Consider fallback providers. Check circuit breaker state.',
  }

  // ── 3. DB Latency Alert ──
  const dbSummary = findSummary(MetricNames.DB_LATENCY)
  const dbP95 = dbSummary?.p95 ?? 0
  const dbLatencyAlert: AlertRule = {
    id: 'db-latency-high',
    name: 'Database Latency P95',
    description: `DB p95 latency exceeds ${thresholds.dbLatencyP95Ms}ms threshold`,
    severity: dbP95 > thresholds.dbLatencyP95Ms * 2 ? 'critical' : 'warning',
    threshold: thresholds.dbLatencyP95Ms,
    unit: 'ms',
    currentValue: Math.round(dbP95),
    active: dbP95 > thresholds.dbLatencyP95Ms,
    recommendedAction: 'Check for slow queries. Verify database connection pool. Check for lock contention. Review recent schema changes.',
  }

  // ── 4. API Latency Alert ──
  const apiSummary = findSummary(MetricNames.API_LATENCY)
  const apiP95 = apiSummary?.p95 ?? 0
  const apiLatencyAlert: AlertRule = {
    id: 'api-latency-high',
    name: 'API Latency P95',
    description: `API p95 latency exceeds ${thresholds.apiLatencyP95Ms}ms threshold`,
    severity: apiP95 > thresholds.apiLatencyP95Ms * 2 ? 'critical' : 'warning',
    threshold: thresholds.apiLatencyP95Ms,
    unit: 'ms',
    currentValue: Math.round(apiP95),
    active: apiP95 > thresholds.apiLatencyP95Ms,
    recommendedAction: 'Check downstream service health. Review recent code changes. Check for N+1 queries. Verify CDN/cache configuration.',
  }

  // ── 5. Auth Failures Alert ──
  const authFailureRate = getMetricRate(MetricNames.AUTH_FAILURE, 1)
  const authFailureAlert: AlertRule = {
    id: 'auth-failures-high',
    name: 'Auth Failures Per Minute',
    description: `Auth failures exceed ${thresholds.authFailuresPerMin}/min threshold`,
    severity: authFailureRate > thresholds.authFailuresPerMin * 2 ? 'critical' : 'warning',
    threshold: thresholds.authFailuresPerMin,
    unit: 'events/min',
    currentValue: Math.round(authFailureRate * 100) / 100,
    active: authFailureRate > thresholds.authFailuresPerMin,
    recommendedAction: 'Check for brute force attacks. Review IP-based rate limiting. Verify credential rotation. Check IdP/SSO health.',
  }

  // ── 6. Rate Limit Alert ──
  const rateLimitRate = getMetricRate(MetricNames.RATE_LIMIT_TRIGGER, 1)
  const rateLimitAlert: AlertRule = {
    id: 'rate-limit-high',
    name: 'Rate Limit Triggers Per Minute',
    description: `Rate limit triggers exceed ${thresholds.rateLimitPerMin}/min threshold`,
    severity: rateLimitRate > thresholds.rateLimitPerMin * 2 ? 'critical' : 'warning',
    threshold: thresholds.rateLimitPerMin,
    unit: 'events/min',
    currentValue: Math.round(rateLimitRate * 100) / 100,
    active: rateLimitRate > thresholds.rateLimitPerMin,
    recommendedAction: 'Investigate traffic patterns. Check for DDoS or abuse. Verify rate limit configuration. Consider adjusting limits if traffic is legitimate.',
  }

  // ── 7. Security Events Alert ──
  const securityRate = getMetricRate(MetricNames.SECURITY_EVENT, 1)
  const securityAlert: AlertRule = {
    id: 'security-events-high',
    name: 'Security Events Per Minute',
    description: `Security events exceed ${thresholds.securityEventsPerMin}/min threshold`,
    severity: 'critical',
    threshold: thresholds.securityEventsPerMin,
    unit: 'events/min',
    currentValue: Math.round(securityRate * 100) / 100,
    active: securityRate > thresholds.securityEventsPerMin,
    recommendedAction: 'URGENT: Investigate potential security breach. Review audit logs. Check for unauthorized access patterns. Escalate to security team.',
  }

  // ── 8. Webhook Failure Rate Alert ──
  const webhookErrorRate = getErrorRate(MetricNames.WEBHOOK_FAILURE, MetricNames.WEBHOOK_SUCCESS, 5)
  const webhookAlert: AlertRule = {
    id: 'webhook-failure-rate-high',
    name: 'Webhook Failure Rate',
    description: `Webhook failure rate exceeds ${thresholds.webhookFailureRate}% threshold`,
    severity: 'warning',
    threshold: thresholds.webhookFailureRate,
    unit: 'percent',
    currentValue: Math.round(webhookErrorRate * 100) / 100,
    active: webhookErrorRate > thresholds.webhookFailureRate,
    recommendedAction: 'Check webhook endpoint availability. Review recent payload changes. Verify retry queue. Check destination service health.',
  }

  // ── 9. Job Failure Rate Alert ──
  const jobErrorRate = getErrorRate(MetricNames.JOB_FAILURE, MetricNames.JOB_SUCCESS, 5)
  const jobAlert: AlertRule = {
    id: 'job-failure-rate-high',
    name: 'Background Job Failure Rate',
    description: `Job failure rate exceeds ${thresholds.jobFailureRate}% threshold`,
    severity: 'warning',
    threshold: thresholds.jobFailureRate,
    unit: 'percent',
    currentValue: Math.round(jobErrorRate * 100) / 100,
    active: jobErrorRate > thresholds.jobFailureRate,
    recommendedAction: 'Check job queue health. Review recent job failures. Verify external dependencies. Check for resource exhaustion.',
  }

  // Set lastTriggeredAt for active alerts
  const allAlerts = [
    errorRateAlert,
    aiFailureAlert,
    dbLatencyAlert,
    apiLatencyAlert,
    authFailureAlert,
    rateLimitAlert,
    securityAlert,
    webhookAlert,
    jobAlert,
  ]

  for (const alert of allAlerts) {
    const state = alertState.get(alert.id)
    if (alert.active) {
      alert.lastTriggeredAt = now
      if (!state) {
        alertState.set(alert.id, { active: true, lastTriggeredAt: now, lastLoggedAt: 0 })
      } else {
        state.active = true
        state.lastTriggeredAt = now
      }
    } else if (state) {
      state.active = false
    }
  }

  return allAlerts
}

// ──────────────────────────────────────────────────────────────
// Main: checkAlerts()
// ──────────────────────────────────────────────────────────────

/**
 * Evaluate current metrics against alert thresholds and return
 * a list of all alerts with their active status.
 *
 * Active alerts are logged (with throttling to prevent log spam).
 *
 * @returns AlertResult with all alerts, health status, and summary
 */
export function checkAlerts(): AlertResult {
  const thresholds = loadThresholds()
  const alerts = evaluateAlertRules(thresholds)
  const now = Date.now()

  // Log active alerts (with throttling)
  for (const alert of alerts) {
    if (!alert.active) continue

    const state = alertState.get(alert.id)
    if (state && (now - state.lastLoggedAt) < ALERT_LOG_THROTTLE_MS) {
      continue // Throttle: don't log the same alert repeatedly
    }

    const logContext = {
      alertId: alert.id,
      alertName: alert.name,
      severity: alert.severity,
      currentValue: alert.currentValue,
      threshold: alert.threshold,
      unit: alert.unit,
    }

    if (alert.severity === 'critical') {
      log.error(`ALERT: ${alert.name} — ${alert.description}`, undefined, logContext)
    } else if (alert.severity === 'warning') {
      log.warn(`ALERT: ${alert.name} — ${alert.description}`, logContext)
    } else {
      log.info(`ALERT: ${alert.name} — ${alert.description}`, logContext)
    }

    // Also send to Sentry as a breadcrumb
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { addBreadcrumb } = require('./sentry')
      addBreadcrumb({
        category: 'alert',
        message: `[${alert.severity.toUpperCase()}] ${alert.name}: ${alert.currentValue}${alert.unit} > ${alert.threshold}${alert.unit}`,
        level: alert.severity === 'critical' ? 'error' : 'warning',
        data: logContext,
      })
    } catch {
      // Sentry not available
    }

    if (state) {
      state.lastLoggedAt = now
    }
  }

  // Compute summary
  const activeAlerts = alerts.filter(a => a.active)
  const criticalCount = activeAlerts.filter(a => a.severity === 'critical').length
  const warningCount = activeAlerts.filter(a => a.severity === 'warning').length
  const infoCount = activeAlerts.filter(a => a.severity === 'info').length

  // Determine overall health
  let health: AlertResult['health'] = 'healthy'
  if (criticalCount > 0) {
    health = 'critical'
  } else if (warningCount > 0) {
    health = 'degraded'
  }

  return {
    alerts,
    health,
    checkedAt: new Date().toISOString(),
    summary: {
      critical: criticalCount,
      warning: warningCount,
      info: infoCount,
      total: activeAlerts.length,
    },
  }
}

// ──────────────────────────────────────────────────────────────
// Utility: Get Current Alert State
// ──────────────────────────────────────────────────────────────

/**
 * Get only the currently active alerts (convenience function).
 */
export function getActiveAlerts(): AlertRule[] {
  return checkAlerts().alerts.filter(a => a.active)
}

/**
 * Get the current alert thresholds (useful for display/debugging).
 */
export function getAlertThresholds(): ThresholdConfig {
  return loadThresholds()
}
