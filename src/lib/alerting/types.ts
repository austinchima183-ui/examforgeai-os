// ============================================================================
// ExamForge AI — Alerting Platform Type System
// ============================================================================
// Complete type definitions for the production alerting platform.
// Extends the existing observability/alerts.ts with incident management,
// multi-channel delivery, escalation policies, and suppression rules.
// ============================================================================

import type { AlertSeverity } from '@/lib/observability/alerts'

// ──────────────────────────────────────────────────────────────
// Alert Channels
// ──────────────────────────────────────────────────────────────

/** Supported alert delivery channels. */
export type AlertChannel =
  | 'slack'
  | 'discord'
  | 'microsoft_teams'
  | 'email'
  | 'sms'
  | 'webhook'

// ──────────────────────────────────────────────────────────────
// Alert Categories
// ──────────────────────────────────────────────────────────────

/** Categorisation of alerts by failure domain. */
export type AlertCategory =
  | 'api_failure'
  | 'database_failure'
  | 'ai_failure'
  | 'payment_failure'
  | 'auth_failure'
  | 'queue_failure'
  | 'cbt_failure'
  | 'high_latency'
  | 'high_error_rate'
  | 'security'

// ──────────────────────────────────────────────────────────────
// Alert Incident
// ──────────────────────────────────────────────────────────────

/** Status of an alert incident throughout its lifecycle. */
export type IncidentStatus = 'firing' | 'acknowledged' | 'resolved'

/**
 * An alert incident represents a concrete occurrence of an alert condition.
 * Created from an AlertRule when the condition fires, tracked through
 * acknowledgement and resolution.
 */
export interface AlertIncident {
  /** Unique incident identifier (UUID v4). */
  id: string
  /** Human-readable title. */
  title: string
  /** Detailed description of the incident. */
  description: string
  /** Severity level (critical, warning, info). */
  severity: AlertSeverity
  /** Alert category for routing and suppression. */
  category: AlertCategory
  /** Current lifecycle status. */
  status: IncidentStatus
  /** ISO-8601 timestamp when the incident was created. */
  firedAt: string
  /** ISO-8601 timestamp when acknowledged (null if unacknowledged). */
  acknowledgedAt: string | null
  /** ISO-8601 timestamp when resolved (null if unresolved). */
  resolvedAt: string | null
  /** User ID of the person who acknowledged the incident. */
  acknowledgedBy: string | null
  /** User ID of the person assigned to the incident. */
  assigneeId: string | null
  /** Arbitrary metadata (metric values, thresholds, etc.). */
  metadata: Record<string, unknown>
  /** Number of notification delivery attempts made. */
  notificationAttempts: number
}

// ──────────────────────────────────────────────────────────────
// Escalation Policy
// ──────────────────────────────────────────────────────────────

/** A single level within an escalation policy. */
export interface EscalationLevel {
  /** 0-based index of this level. */
  level: number
  /** Minutes after incident creation before this level triggers. */
  delayMinutes: number
  /** Channels to notify at this level. */
  channels: AlertChannel[]
  /** Recipients — either user IDs or team/channel identifiers. */
  recipients: EscalationRecipient[]
}

/** Recipient for escalation notifications. */
export interface EscalationRecipient {
  /** Type of recipient. */
  type: 'user' | 'team' | 'channel'
  /** Identifier (user ID, team slug, or channel name). */
  id: string
}

/** An escalation policy defines how alerts are progressively escalated. */
export interface AlertEscalationPolicy {
  /** Unique policy identifier. */
  id: string
  /** Human-readable policy name. */
  name: string
  /** Ordered escalation levels. */
  levels: EscalationLevel[]
  /** Minutes before repeating from level 0 (0 = no repeat). */
  repeatInterval: number
}

/** Result of evaluating whether escalation should occur. */
export interface EscalationAction {
  /** The escalation level to execute. */
  level: number
  /** Channels to notify. */
  channels: AlertChannel[]
  /** Recipients to notify. */
  recipients: EscalationRecipient[]
  /** Reason for the escalation. */
  reason: string
}

// ──────────────────────────────────────────────────────────────
// Alert Suppression
// ──────────────────────────────────────────────────────────────

/**
 * A suppression rule prevents alerts of a given category from firing.
 * Used for maintenance windows, known issues, and duplicate dampening.
 */
export interface AlertSuppression {
  /** Unique suppression identifier. */
  id: string
  /** Name of the rule or alert being suppressed. */
  ruleName: string
  /** Category of alerts being suppressed. */
  category: AlertCategory
  /** ISO-8601 timestamp when suppression expires (null = indefinite). */
  suppressUntil: string | null
  /** User ID of the person who created the suppression. */
  suppressedBy: string | null
  /** Reason for suppression (e.g., 'Scheduled maintenance'). */
  reason: string
  /** ISO-8601 timestamp when suppression was created. */
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Alert Channel Configuration
// ──────────────────────────────────────────────────────────────

/** Configuration for a specific alert delivery channel. */
export interface AlertChannelConfig {
  /** Unique config identifier. */
  id: string
  /** Channel type. */
  channel: AlertChannel
  /** Whether this channel is enabled. */
  enabled: boolean
  /** Channel-specific connection details. */
  config: SlackChannelConfig | DiscordChannelConfig | TeamsChannelConfig
    | EmailChannelConfig | SmsChannelConfig | WebhookChannelConfig
  /** ISO-8601 timestamp when last modified. */
  updatedAt: string
}

/** Slack channel configuration. */
export interface SlackChannelConfig {
  webhookUrl: string
  /** Slack channel name (e.g., '#alerts-critical'). */
  channel?: string
}

/** Discord channel configuration. */
export interface DiscordChannelConfig {
  webhookUrl: string
}

/** Microsoft Teams channel configuration. */
export interface TeamsChannelConfig {
  webhookUrl: string
}

/** Email channel configuration. */
export interface EmailChannelConfig {
  /** Recipient email addresses. */
  recipients: string[]
  /** Sender email address. */
  from?: string
}

/** SMS channel configuration. */
export interface SmsChannelConfig {
  /** Recipient phone numbers (E.164 format). */
  recipients: string[]
}

/** Generic webhook channel configuration. */
export interface WebhookChannelConfig {
  /** Webhook endpoint URL. */
  url: string
  /** HMAC signing secret for secure delivery. */
  secret: string
  /** Custom HTTP headers. */
  headers?: Record<string, string>
}

// ──────────────────────────────────────────────────────────────
// Incident Timeline
// ──────────────────────────────────────────────────────────────

/** Type of event in the incident timeline. */
export type IncidentEventType =
  | 'created'
  | 'acknowledged'
  | 'escalated'
  | 'suppressed'
  | 'resolved'
  | 'notification_sent'
  | 'notification_failed'

/** A single event in the incident timeline. */
export interface IncidentEvent {
  /** ISO-8601 timestamp of the event. */
  timestamp: string
  /** Type of event. */
  type: IncidentEventType
  /** Actor (user ID, 'system', or channel name). */
  actor: string
  /** Human-readable details. */
  details: string
  /** Additional metadata. */
  metadata?: Record<string, unknown>
}

/** Timeline of all events for an incident. */
export interface IncidentTimeline {
  /** Incident ID. */
  incidentId: string
  /** Ordered list of timeline events. */
  events: IncidentEvent[]
}

// ──────────────────────────────────────────────────────────────
// Notification Attempt
// ──────────────────────────────────────────────────────────────

/** Tracks a single notification delivery attempt. */
export interface NotificationAttempt {
  /** Channel used. */
  channel: AlertChannel
  /** ISO-8601 timestamp of the attempt. */
  timestamp: string
  /** Whether the delivery succeeded. */
  success: boolean
  /** Error message if failed. */
  error?: string
  /** Channel-specific response metadata. */
  metadata?: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────
// Incident Filters (for list/query)
// ──────────────────────────────────────────────────────────────

/** Filters for querying incidents. */
export interface IncidentFilters {
  status?: IncidentStatus
  severity?: AlertSeverity
  category?: AlertCategory
  assigneeId?: string
  since?: string
  until?: string
  limit?: number
  offset?: number
}

// ──────────────────────────────────────────────────────────────
// Category → Alert Rule ID Mapping
// ──────────────────────────────────────────────────────────────

/** Maps alert categories to existing AlertRule IDs from observability/alerts.ts. */
export const CATEGORY_RULE_MAP: Record<AlertCategory, string[]> = {
  api_failure: ['error-rate-high', 'api-latency-high'],
  database_failure: ['db-latency-high'],
  ai_failure: ['ai-failure-rate-high'],
  payment_failure: [],
  auth_failure: ['auth-failures-high'],
  queue_failure: ['job-failure-rate-high'],
  cbt_failure: [],
  high_latency: ['api-latency-high', 'db-latency-high'],
  high_error_rate: ['error-rate-high', 'webhook-failure-rate-high', 'job-failure-rate-high'],
  security: ['security-events-high', 'rate-limit-high'],
}

/** Maps existing AlertRule IDs to alert categories. */
export const RULE_CATEGORY_MAP: Record<string, AlertCategory> = {
  'error-rate-high': 'api_failure',
  'ai-failure-rate-high': 'ai_failure',
  'db-latency-high': 'database_failure',
  'api-latency-high': 'high_latency',
  'auth-failures-high': 'auth_failure',
  'rate-limit-high': 'security',
  'security-events-high': 'security',
  'webhook-failure-rate-high': 'high_error_rate',
  'job-failure-rate-high': 'queue_failure',
}

/** Severity color mapping for notification formatting. */
export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: '#DC2626',  // red-600
  warning: '#F59E0B',   // amber-500
  info: '#3B82F6',      // blue-500
}

/** Category icon mapping (emoji for Slack/Discord). */
export const CATEGORY_ICONS: Record<AlertCategory, string> = {
  api_failure: '🚨',
  database_failure: '🗄️',
  ai_failure: '🤖',
  payment_failure: '💳',
  auth_failure: '🔐',
  queue_failure: '📋',
  cbt_failure: '📝',
  high_latency: '⚡',
  high_error_rate: '📊',
  security: '🛡️',
}

/** Human-readable category labels. */
export const CATEGORY_LABELS: Record<AlertCategory, string> = {
  api_failure: 'API Failure',
  database_failure: 'Database Failure',
  ai_failure: 'AI Provider Failure',
  payment_failure: 'Payment Failure',
  auth_failure: 'Authentication Failure',
  queue_failure: 'Queue/Job Failure',
  cbt_failure: 'CBT System Failure',
  high_latency: 'High Latency',
  high_error_rate: 'High Error Rate',
  security: 'Security Event',
}
