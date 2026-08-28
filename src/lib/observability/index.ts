// ============================================================================
// ExamForge AI — Observability Barrel Export
// ============================================================================
// Single import point for all observability utilities:
//   import { captureException, logger, recordMetric, checkAlerts } from '@/lib/observability'
// ============================================================================

// ── Sentry ──
export {
  initSentryServer,
  initSentryClient,
  captureException,
  captureMessage,
  addBreadcrumb,
  setUser,
  setTag,
  setContext,
} from './sentry'

export type {
  SentryRequestContext,
  SentryConfig,
} from './sentry'

// ── Logger ──
export {
  createLogger,
  logger,
  withRequestContext,
  updateRequestContext,
  getCurrentRequestContext,
  getRequestId,
} from './logger'

export type {
  LogLevel,
  LogContext,
  LogEntry,
  Logger,
} from './logger'

// ── Metrics ──
export {
  MetricNames,
  recordMetric,
  recordLatency,
  incrementCounter,
  getMetrics,
  getMetricSummary,
  getMetricRate,
  getErrorRate,
  resetMetrics,
  getStoreStartTime,
  getTotalDataPoints,
  startMetricsLogging,
  stopMetricsLogging,
} from './metrics'

export type {
  MetricName,
  MetricTag,
  MetricDataPoint,
  MetricSummary,
} from './metrics'

// ── Alerts ──
export {
  checkAlerts,
  getActiveAlerts,
  getAlertThresholds,
} from './alerts'

export type {
  AlertSeverity,
  AlertRule,
  AlertResult,
} from './alerts'
