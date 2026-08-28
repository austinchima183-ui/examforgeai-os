// ============================================================================
// ExamForge AI — Notification Event Handlers
// ============================================================================
// Event-driven handlers for each NotificationType. Each handler:
//   1. Resolves recipients from the domain
//   2. Resolves the template for the notification type
//   3. Resolves delivery channels from user preferences
//   4. Enqueues the notification for processing
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/observability/logger'
import { enqueueNotification } from './queue'
import { resolveTemplateId } from './template-engine'
import type {
  NotificationEvent,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  SupportedLocale,
} from './types'

const log = createLogger('notifications:event-handlers')

// ──────────────────────────────────────────────────────────────
// Event Handler Type
// ──────────────────────────────────────────────────────────────

/**
 * An event handler resolves recipients, template, and channels,
 * then builds and enqueues a NotificationEvent.
 */
export type NotificationEventHandler = (
  _sourceData: Record<string, unknown>
) => Promise<string | null> // Returns queue entry ID or null

// ──────────────────────────────────────────────────────────────
// Handler Registry
// ──────────────────────────────────────────────────────────────

const handlerRegistry = new Map<NotificationType, NotificationEventHandler>()

/**
 * Register a handler for a notification type.
 */
export function registerHandler(type: NotificationType, handler: NotificationEventHandler): void {
  handlerRegistry.set(type, handler)
  log.debug('Event handler registered', { type })
}

/**
 * Get a handler for a notification type.
 */
export function getHandler(type: NotificationType): NotificationEventHandler | undefined {
  return handlerRegistry.get(type)
}

/**
 * Dispatch an event to its registered handler.
 *
 * @param type       — Notification type
 * @param sourceData — Source event data
 * @returns Queue entry ID or null
 */
export async function dispatchEvent(
  type: NotificationType,
  sourceData: Record<string, unknown>
): Promise<string | null> {
  const handler = handlerRegistry.get(type)
  if (!handler) {
    log.error('No handler registered for notification type', undefined, { type })
    return null
  }

  return handler(sourceData)
}

// ──────────────────────────────────────────────────────────────
// Helper: Build and Enqueue Event
// ──────────────────────────────────────────────────────────────

/**
 * Build a NotificationEvent and enqueue it.
 */
async function buildAndEnqueue(params: {
  type: NotificationType
  recipientIds: string[]
  data: Record<string, unknown>
  priority?: NotificationPriority
  channels?: NotificationChannel[]
  templateId?: string
  locale?: SupportedLocale
  sendAt?: string
  sourceId?: string
  sourceType?: string
  organizationId?: string
  schoolId?: string
}): Promise<string | null> {
  const event: NotificationEvent = {
    id: crypto.randomUUID(),
    type: params.type,
    priority: params.priority ?? 'normal',
    recipientIds: params.recipientIds,
    data: params.data,
    channels: params.channels,
    templateId: params.templateId ?? resolveTemplateId(params.type),
    locale: params.locale ?? 'en',
    createdAt: new Date().toISOString(),
    sendAt: params.sendAt,
    sourceId: params.sourceId,
    sourceType: params.sourceType,
    organizationId: params.organizationId,
    schoolId: params.schoolId,
  }

  return enqueueNotification(event)
}

// ──────────────────────────────────────────────────────────────
// Exam Reminder Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle exam_reminder events.
 * Resolves exam participants as recipients.
 */
export async function onExamReminder(sourceData: Record<string, unknown>): Promise<string | null> {
  const examId = sourceData.examId as string
  const schoolId = sourceData.schoolId as string | undefined
  const organizationId = sourceData.organizationId as string | undefined

  log.info('Exam reminder event', { examId })

  try {
    // Resolve exam participants
    const recipientIds = await resolveExamParticipants(examId)

    if (recipientIds.length === 0) {
      log.warn('No participants found for exam reminder', { examId })
      return null
    }

    return buildAndEnqueue({
      type: 'exam_reminder',
      recipientIds,
      data: sourceData,
      priority: 'high',
      channels: ['in_app', 'push', 'email'],
      sourceId: examId,
      sourceType: 'exam',
      organizationId,
      schoolId,
    })
  } catch (error) {
    log.error('Exam reminder handler failed', error, { examId })
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// Exam Result Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle exam_result events.
 * Resolves students who took the exam as recipients.
 */
export async function onExamResult(sourceData: Record<string, unknown>): Promise<string | null> {
  const examId = sourceData.examId as string

  log.info('Exam result event', { examId })

  try {
    const recipientIds = await resolveExamParticipants(examId)

    if (recipientIds.length === 0) {
      log.warn('No participants found for exam result', { examId })
      return null
    }

    return buildAndEnqueue({
      type: 'exam_result',
      recipientIds,
      data: sourceData,
      priority: 'high',
      channels: ['in_app', 'push', 'email'],
      sourceId: examId,
      sourceType: 'exam',
    })
  } catch (error) {
    log.error('Exam result handler failed', error, { examId })
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// Payment Due Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle payment events.
 * Sends urgent notification to the user with an outstanding balance.
 */
export async function onPaymentDue(sourceData: Record<string, unknown>): Promise<string | null> {
  const userId = sourceData.userId as string
  const paymentId = sourceData.paymentId as string

  log.info('Payment due event', { userId, paymentId })

  return buildAndEnqueue({
    type: 'payment',
    recipientIds: [userId],
    data: sourceData,
    priority: 'urgent',
    channels: ['in_app', 'push', 'email', 'sms'],
    sourceId: paymentId,
    sourceType: 'payment',
  })
}

// ──────────────────────────────────────────────────────────────
// Enrollment Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle enrollment events.
 * Notifies the enrolled student.
 */
export async function onEnrollment(sourceData: Record<string, unknown>): Promise<string | null> {
  const userId = sourceData.userId as string
  const enrollmentId = sourceData.enrollmentId as string

  log.info('Enrollment event', { userId, enrollmentId })

  return buildAndEnqueue({
    type: 'enrollment',
    recipientIds: [userId],
    data: sourceData,
    priority: 'normal',
    channels: ['in_app', 'email'],
    sourceId: enrollmentId,
    sourceType: 'enrollment',
  })
}

// ──────────────────────────────────────────────────────────────
// Assignment Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle assignment events.
 * Resolves assigned students as recipients.
 */
export async function onAssignment(sourceData: Record<string, unknown>): Promise<string | null> {
  const assignmentId = sourceData.assignmentId as string
  const recipientIds = (sourceData.recipientIds as string[]) ?? []

  log.info('Assignment event', { assignmentId, recipientCount: recipientIds.length })

  if (recipientIds.length === 0) {
    const resolved = await resolveAssignmentRecipients(assignmentId)
    if (resolved.length === 0) return null
    sourceData.recipientIds = resolved
  }

  return buildAndEnqueue({
    type: 'assignment',
    recipientIds: (sourceData.recipientIds as string[]),
    data: sourceData,
    priority: 'normal',
    channels: ['in_app', 'push'],
    sourceId: assignmentId,
    sourceType: 'assignment',
  })
}

// ──────────────────────────────────────────────────────────────
// Announcement Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle announcement events.
 * Broadcasts to all users in a school/organisation.
 */
export async function onAnnouncement(sourceData: Record<string, unknown>): Promise<string | null> {
  const schoolId = sourceData.schoolId as string

  log.info('Announcement event', { schoolId })

  try {
    const recipientIds = await resolveSchoolMembers(schoolId)

    if (recipientIds.length === 0) return null

    return buildAndEnqueue({
      type: 'announcement',
      recipientIds,
      data: sourceData,
      priority: 'normal',
      channels: ['in_app', 'push'],
      sourceId: sourceData.announcementId as string,
      sourceType: 'announcement',
      schoolId,
    })
  } catch (error) {
    log.error('Announcement handler failed', error, { schoolId })
    return null
  }
}

// ──────────────────────────────────────────────────────────────
// Message Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle direct/group message events.
 */
export async function onMessage(sourceData: Record<string, unknown>): Promise<string | null> {
  const recipientIds = (sourceData.recipientIds as string[]) ?? []

  log.info('Message event', { recipientCount: recipientIds.length })

  if (recipientIds.length === 0) return null

  return buildAndEnqueue({
    type: 'message',
    recipientIds,
    data: sourceData,
    priority: 'normal',
    channels: ['in_app', 'push'],
    sourceId: sourceData.messageId as string,
    sourceType: 'message',
  })
}

// ──────────────────────────────────────────────────────────────
// Subscription Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle subscription events (trial ending, renewal, etc.).
 */
export async function onSubscription(sourceData: Record<string, unknown>): Promise<string | null> {
  const userId = sourceData.userId as string

  log.info('Subscription event', { userId })

  return buildAndEnqueue({
    type: 'subscription',
    recipientIds: [userId],
    data: sourceData,
    priority: 'high',
    channels: ['in_app', 'email'],
    sourceId: sourceData.subscriptionId as string,
    sourceType: 'subscription',
  })
}

// ──────────────────────────────────────────────────────────────
// AI Generation Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle AI generation events (insight ready, generation complete).
 */
export async function onAiGeneration(sourceData: Record<string, unknown>): Promise<string | null> {
  const userId = sourceData.userId as string

  log.info('AI generation event', { userId })

  return buildAndEnqueue({
    type: 'ai_generation',
    recipientIds: [userId],
    data: sourceData,
    priority: 'low',
    channels: ['in_app'],
    sourceId: sourceData.generationId as string,
    sourceType: 'ai_generation',
  })
}

// ──────────────────────────────────────────────────────────────
// Marketplace Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle marketplace events (purchase, review, etc.).
 */
export async function onMarketplace(sourceData: Record<string, unknown>): Promise<string | null> {
  const userId = sourceData.userId as string

  log.info('Marketplace event', { userId })

  return buildAndEnqueue({
    type: 'marketplace',
    recipientIds: [userId],
    data: sourceData,
    priority: 'low',
    channels: ['in_app', 'email'],
    sourceId: sourceData.listingId as string,
    sourceType: 'marketplace',
  })
}

// ──────────────────────────────────────────────────────────────
// System Handler
// ──────────────────────────────────────────────────────────────

/**
 * Handle system events (password reset, maintenance, etc.).
 */
export async function onSystem(sourceData: Record<string, unknown>): Promise<string | null> {
  const recipientIds = (sourceData.recipientIds as string[]) ?? [sourceData.userId as string]

  log.info('System event', { recipientCount: recipientIds.length })

  if (recipientIds.length === 0 || recipientIds[0] === undefined) return null

  return buildAndEnqueue({
    type: 'system',
    recipientIds: recipientIds.filter(Boolean),
    data: sourceData,
    priority: (sourceData.priority as NotificationPriority) ?? 'normal',
    channels: (sourceData.channels as NotificationChannel[]) ?? ['in_app', 'email'],
    sourceId: sourceData.sourceId as string,
    sourceType: 'system',
  })
}

// ──────────────────────────────────────────────────────────────
// Recipient Resolution Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Resolve participant user IDs for an exam.
 */
async function resolveExamParticipants(examId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('exam_participants')
      .select('user_id')
      .eq('exam_id', examId)

    if (error || !data) {
      log.error('Failed to resolve exam participants', error, { examId })
      return []
    }

    return data.map((row: Record<string, unknown>) => row.user_id as string)
  } catch (error) {
    log.error('Exam participant resolution exception', error, { examId })
    return []
  }
}

/**
 * Resolve assigned student user IDs for an assignment.
 */
async function resolveAssignmentRecipients(assignmentId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('assignment_recipients')
      .select('user_id')
      .eq('assignment_id', assignmentId)

    if (error || !data) {
      log.error('Failed to resolve assignment recipients', error, { assignmentId })
      return []
    }

    return data.map((row: Record<string, unknown>) => row.user_id as string)
  } catch (error) {
    log.error('Assignment recipient resolution exception', error, { assignmentId })
    return []
  }
}

/**
 * Resolve all member user IDs for a school.
 */
async function resolveSchoolMembers(schoolId: string): Promise<string[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', schoolId)
      .limit(500) // Cap at 500 to prevent accidental mass notification

    if (error || !data) {
      log.error('Failed to resolve school members', error, { schoolId })
      return []
    }

    return data.map((row: Record<string, unknown>) => row.id as string)
  } catch (error) {
    log.error('School member resolution exception', error, { schoolId })
    return []
  }
}

// ──────────────────────────────────────────────────────────────
// Register All Handlers
// ──────────────────────────────────────────────────────────────

/**
 * Register all built-in event handlers.
 */
export function registerAllHandlers(): void {
  registerHandler('exam_reminder', onExamReminder)
  registerHandler('exam_result', onExamResult)
  registerHandler('assignment', onAssignment)
  registerHandler('announcement', onAnnouncement)
  registerHandler('message', onMessage)
  registerHandler('subscription', onSubscription)
  registerHandler('payment', onPaymentDue)
  registerHandler('system', onSystem)
  registerHandler('ai_generation', onAiGeneration)
  registerHandler('marketplace', onMarketplace)
  registerHandler('enrollment', onEnrollment)

  log.info('All notification event handlers registered', {
    count: handlerRegistry.size,
  })
}

// Auto-register on import
registerAllHandlers()
