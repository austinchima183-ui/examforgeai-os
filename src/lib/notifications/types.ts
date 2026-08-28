// ============================================================================
// ExamForge AI — Notification Type System
// ============================================================================
// Complete type definitions for the production notification system.
// Event-driven architecture with multi-channel delivery, template rendering,
// retry queues, bounce tracking, digest compilation, and provider abstraction.
// ============================================================================

import type {
  NotificationChannel as SupabaseNotificationChannel,
  NotificationType as SupabaseNotificationType,
} from '@/lib/supabase/types'

/** Re-export NotificationChannel from supabase types for consumer convenience. */
export type NotificationChannel = SupabaseNotificationChannel

/** Re-export NotificationType from supabase types for consumer convenience. */
export type NotificationType = SupabaseNotificationType

/** Mobile platform types for push notification delivery. */
export type MobilePlatform = 'ios' | 'android' | 'web'

// ──────────────────────────────────────────────────────────────
// Core Enums
// ──────────────────────────────────────────────────────────────

/** Delivery status for a single notification dispatch attempt. */
export type DeliveryStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced'
  | 'suppressed'

/** Priority levels controlling delivery urgency and retry behaviour. */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

/** Supported notification delivery providers. */
export type NotificationProvider =
  | 'resend'
  | 'smtp'
  | 'firebase'
  | 'twilio'
  | 'supabase_realtime'

/** Supported SMS providers (Africa-focused). */
export type SmsProviderName = 'twilio' | 'africas_talking' | 'termii'

/** Supported locales for template localisation. */
export type SupportedLocale = 'en' | 'fr' | 'yo' | 'ha' | 'ig' | 'pt' | 'sw'

/** Digest aggregation period. */
export type DigestType = 'daily' | 'weekly'

// ──────────────────────────────────────────────────────────────
// Notification Event (Source of Truth)
// ──────────────────────────────────────────────────────────────

/**
 * Event-driven source of truth for every notification.
 * All notification delivery begins with a NotificationEvent.
 */
export interface NotificationEvent {
  /** Unique event identifier (UUID v4). */
  id: string
  /** The kind of notification (maps to NotificationType). */
  type: NotificationType
  /** Priority controlling delivery urgency. */
  priority: NotificationPriority
  /** User IDs of all recipients. */
  recipientIds: string[]
  /** Template variables for rendering subject/body. */
  data: Record<string, unknown>
  /** Channels to attempt delivery on (derived from preferences if empty). */
  channels?: NotificationChannel[]
  /** Template ID override (auto-resolved from type if omitted). */
  templateId?: string
  /** Locale for template localisation (defaults to recipient preference). */
  locale?: SupportedLocale
  /** ISO-8601 timestamp when the event was created. */
  createdAt: string
  /** ISO-8601 timestamp when the event should be delivered (null = immediate). */
  sendAt?: string
  /** ID of the entity that triggered this event (e.g. examId, paymentId). */
  sourceId?: string
  /** Type of the source entity. */
  sourceType?: string
  /** Organisation/school context for tenant isolation. */
  organizationId?: string
  schoolId?: string
  /** Metadata for observability and audit. */
  metadata?: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────
// Notification Template
// ──────────────────────────────────────────────────────────────

/**
 * Template with localisation support.
 * Each template can have multiple locale variants.
 */
export interface NotificationTemplate {
  /** Unique template identifier (e.g. 'exam_reminder'). */
  id: string
  /** The notification type this template serves. */
  type: NotificationType
  /** Locale code for this variant. */
  locale: SupportedLocale
  /** Subject line template (supports {{variable}} interpolation). */
  subject: string
  /** HTML body template (supports {{variable}} interpolation). */
  htmlBody: string
  /** Plain-text body template (supports {{variable}} interpolation). */
  textBody: string
  /** Short push/SMS body (supports {{variable}} interpolation). */
  shortBody: string
  /** Default priority for notifications from this template. */
  defaultPriority: NotificationPriority
  /** Default channels for this template type. */
  defaultChannels: NotificationChannel[]
  /** Whether this template is active. */
  active: boolean
  /** ISO-8601 created timestamp. */
  createdAt: string
  /** ISO-8601 last-updated timestamp. */
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Notification Delivery
// ──────────────────────────────────────────────────────────────

/**
 * Tracks each delivery attempt for a notification event.
 * One NotificationEvent may produce multiple NotificationDelivery records
 * (one per channel per recipient).
 */
export interface NotificationDelivery {
  /** Unique delivery record identifier. */
  id: string
  /** The event that triggered this delivery. */
  eventId: string
  /** The notification row ID in the Supabase notifications table. */
  notificationId: string
  /** Recipient user ID. */
  userId: string
  /** Channel used for this delivery attempt. */
  channel: NotificationChannel
  /** Provider used for this delivery attempt. */
  provider: NotificationProvider
  /** Current delivery status. */
  status: DeliveryStatus
  /** Recipient address (email, phone, FCM token, etc.). */
  recipientAddress: string
  /** Number of delivery attempts so far. */
  attemptCount: number
  /** Maximum retry attempts allowed. */
  maxAttempts: number
  /** ISO-8601 timestamp of the next retry (null if no retry pending). */
  nextRetryAt: string | null
  /** Provider-specific ID for delivery tracking (e.g. Resend email ID). */
  providerId: string | null
  /** ISO-8601 timestamp when sent to the provider. */
  sentAt: string | null
  /** ISO-8601 timestamp when the provider confirmed delivery. */
  deliveredAt: string | null
  /** Error message from the last failed attempt. */
  lastError: string | null
  /** Additional provider-specific metadata. */
  metadata: Record<string, unknown>
  /** ISO-8601 created timestamp. */
  createdAt: string
  /** ISO-8601 last-updated timestamp. */
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Notification Preference
// ──────────────────────────────────────────────────────────────

/**
 * User preferences per notification type and channel.
 * Stored as rows in notification_preferences or in profile JSONB.
 */
export interface NotificationPreference {
  /** User ID. */
  userId: string
  /** Notification type. */
  type: NotificationType
  /** Delivery channel. */
  channel: NotificationChannel
  /** Whether this type+channel combination is enabled. */
  enabled: boolean
  /** ISO-8601 last-updated timestamp. */
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Notification Queue (Retry Queue Entry)
// ──────────────────────────────────────────────────────────────

/**
 * Persistent queue entry in the notification_queue table.
 * Used for reliable delivery with retry and backoff.
 */
export interface NotificationQueue {
  /** Unique queue entry identifier. */
  id: string
  /** The event being processed. */
  eventId: string
  /** Delivery record ID. */
  deliveryId: string
  /** Channel for this queue entry. */
  channel: NotificationChannel
  /** Current processing status. */
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'dead_letter'
  /** Number of processing attempts. */
  attempt: number
  /** Maximum attempts before moving to dead letter. */
  maxAttempts: number
  /** Backoff in milliseconds for the next attempt. */
  backoffMs: number
  /** ISO-8601 timestamp when this entry should be processed. */
  processAt: string
  /** ISO-8601 timestamp when processing started. */
  startedAt: string | null
  /** ISO-8601 timestamp when processing completed. */
  completedAt: string | null
  /** Error from the last failed attempt. */
  lastError: string | null
  /** ISO-8601 created timestamp. */
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Notification Bounce
// ──────────────────────────────────────────────────────────────

/**
 * Bounce tracking record.
 * When a delivery bounces, we record it and may suppress future sends.
 */
export interface NotificationBounce {
  /** Unique bounce record identifier. */
  id: string
  /** The recipient address that bounced. */
  address: string
  /** Channel on which the bounce occurred. */
  channel: NotificationChannel
  /** Bounce type (hard = permanent, soft = transient). */
  bounceType: 'hard' | 'soft' | 'complaint'
  /** Provider-specific bounce code. */
  bounceCode: string | null
  /** Diagnostic message from the provider. */
  diagnostic: string | null
  /** Whether this address is now suppressed. */
  suppressed: boolean
  /** ISO-8601 timestamp when the bounce was recorded. */
  bouncedAt: string
  /** ISO-8601 created timestamp. */
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Notification Digest
// ──────────────────────────────────────────────────────────────

/**
 * Digest configuration for a user.
 * Controls whether the user receives daily/weekly digest emails
 * summarising unread notifications.
 */
export interface NotificationDigest {
  /** User ID. */
  userId: string
  /** Digest aggregation period. */
  digestType: DigestType
  /** Whether this digest is enabled. */
  enabled: boolean
  /** Preferred delivery channel for the digest. */
  channel: NotificationChannel
  /** ISO-8601 time of day for digest delivery (e.g. '08:00'). */
  sendTime: string
  /** ISO-8601 day of week for weekly digest (e.g. 'monday'). */
  dayOfWeek?: string
  /** ISO-8601 timestamp of the last digest sent. */
  lastSentAt: string | null
  /** ISO-8601 created timestamp. */
  createdAt: string
  /** ISO-8601 last-updated timestamp. */
  updatedAt: string
}

/** Compiled digest ready for delivery. */
export interface CompiledDigest {
  /** User ID. */
  userId: string
  /** Digest type. */
  digestType: DigestType
  /** Period start. */
  periodStart: string
  /** Period end. */
  periodEnd: string
  /** Grouped notification summaries. */
  summaries: DigestGroup[]
  /** Total unread count in this period. */
  totalUnread: number
  /** Rendered HTML. */
  html: string
  /** Rendered plain text. */
  text: string
}

/** A group of notifications of the same type within a digest. */
export interface DigestGroup {
  type: NotificationType
  count: number
  title: string
  items: DigestItem[]
}

/** A single notification item within a digest group. */
export interface DigestItem {
  id: string
  title: string
  body: string
  actionUrl: string | null
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Provider Config Types
// ──────────────────────────────────────────────────────────────

/** Configuration for email delivery via Resend. */
export interface EmailProviderConfig {
  provider: 'resend' | 'smtp'
  /** Resend API key (for Resend provider). */
  apiKey?: string
  /** Default "from" address. */
  fromEmail: string
  /** Default "from" name. */
  fromName: string
  /** Reply-to address. */
  replyTo?: string
  /** SMTP host (for SMTP provider). */
  smtpHost?: string
  /** SMTP port (for SMTP provider). */
  smtpPort?: number
  /** SMTP username (for SMTP provider). */
  smtpUser?: string
  /** SMTP password (for SMTP provider). */
  smtpPass?: string
  /** Whether to use TLS for SMTP. */
  smtpTls?: boolean
}

/** Configuration for push delivery via Firebase Cloud Messaging. */
export interface PushProviderConfig {
  provider: 'firebase'
  /** Firebase project ID. */
  projectId: string
  /** Path to service account key JSON. */
  serviceAccountKey?: string
  /** Server key (legacy FCM). */
  serverKey?: string
}

/** Configuration for SMS delivery via Twilio. */
export interface SmsProviderConfig {
  provider: SmsProviderName
  /** Twilio account SID. */
  accountSid?: string
  /** Twilio auth token. */
  authToken?: string
  /** Twilio phone number (E.164 format). */
  phoneNumber?: string
  /** Africa's Talking username. */
  atUsername?: string
  /** Africa's Talking API key. */
  atApiKey?: string
  /** Africa's Talking sender ID. */
  atSender?: string
  /** Termii API key. */
  termiiApiKey?: string
  /** Termii sender ID. */
  termiiSender?: string
}

// ──────────────────────────────────────────────────────────────
// Scheduled Notification
// ──────────────────────────────────────────────────────────────

/** A scheduled notification entry. */
export interface ScheduledNotification {
  /** Unique schedule identifier. */
  id: string
  /** The notification event to deliver. */
  event: NotificationEvent
  /** ISO-8601 timestamp when the notification should be sent. */
  sendAt: string
  /** Current status. */
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  /** ISO-8601 created timestamp. */
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Delivery Result
// ──────────────────────────────────────────────────────────────

/** Result of a single delivery attempt. */
export interface DeliveryResult {
  /** Whether the delivery was successful. */
  success: boolean
  /** The delivery status. */
  status: DeliveryStatus
  /** Provider-specific ID (e.g. Resend email ID, Twilio message SID). */
  providerId?: string
  /** Error message if delivery failed. */
  error?: string
  /** Additional metadata from the provider. */
  metadata?: Record<string, unknown>
}

// ──────────────────────────────────────────────────────────────
// Queue Statistics
// ──────────────────────────────────────────────────────────────

/** Statistics about the notification queue. */
export interface QueueStats {
  /** Number of entries in 'queued' status. */
  queued: number
  /** Number of entries in 'processing' status. */
  processing: number
  /** Number of entries in 'completed' status. */
  completed: number
  /** Number of entries in 'failed' status. */
  failed: number
  /** Number of entries in 'dead_letter' status. */
  deadLetter: number
  /** Total entries. */
  total: number
  /** Oldest queued entry timestamp. */
  oldestQueuedAt: string | null
}

// ──────────────────────────────────────────────────────────────
// User Context for Delivery
// ──────────────────────────────────────────────────────────────

/** Minimal user context needed for delivery. */
export interface NotificationUser {
  /** User ID. */
  id: string
  /** Email address. */
  email: string
  /** Phone number (E.164 format). */
  phone: string | null
  /** FCM push token. */
  pushToken: string | null
  /** Preferred locale. */
  locale: SupportedLocale
  /** User role for preference defaults. */
  role: string
}

// ──────────────────────────────────────────────────────────────
// Template Variable Map
// ──────────────────────────────────────────────────────────────

/** Map of template variable names to their values. */
export type TemplateVariables = Record<string, string | number | boolean | null | undefined>

// ──────────────────────────────────────────────────────────────
// Bounce Info (from provider webhook)
// ──────────────────────────────────────────────────────────────

/** Bounce information received from a provider webhook. */
export interface BounceInfo {
  /** The recipient address that bounced. */
  address: string
  /** Bounce type. */
  bounceType: 'hard' | 'soft' | 'complaint'
  /** Provider-specific bounce code. */
  bounceCode?: string
  /** Diagnostic message. */
  diagnostic?: string
  /** Provider event ID. */
  providerEventId?: string
}
