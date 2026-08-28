// ============================================================================
// ExamForge AI — Event Bus Type Definitions
// ============================================================================
// Comprehensive event types, interfaces, and payload definitions for the
// Event Bus system. Every action in ExamForge becomes a typed event.
// Events power: automation, analytics, notifications, audit logs, AI memory, integrations.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Event Type Enum — 40+ Domain Events
// ──────────────────────────────────────────────────────────────

export enum EventType {
  // ── Student Events ──
  StudentCreated = 'student.created',
  StudentEnrolled = 'student.enrolled',
  StudentWithdrawn = 'student.withdrawn',
  StudentTransferred = 'student.transferred',
  StudentProfileUpdated = 'student.profile_updated',

  // ── Teacher Events ──
  TeacherCreated = 'teacher.created',
  TeacherAssigned = 'teacher.assigned',
  TeacherUnassigned = 'teacher.unassigned',
  TeacherProfileUpdated = 'teacher.profile_updated',

  // ── Parent Events ──
  ParentCreated = 'parent.created',
  ParentLinkedToStudent = 'parent.linked_to_student',
  ParentUnlinkedFromStudent = 'parent.unlinked_from_student',

  // ── Exam Events ──
  ExamCreated = 'exam.created',
  ExamPublished = 'exam.published',
  ExamStarted = 'exam.started',
  ExamSubmitted = 'exam.submitted',
  ExamGraded = 'exam.graded',
  ExamArchived = 'exam.archived',
  ExamCancelled = 'exam.cancelled',

  // ── Question Events ──
  QuestionCreated = 'question.created',
  QuestionGenerated = 'question.generated',
  QuestionUpdated = 'question.updated',
  QuestionDeleted = 'question.deleted',

  // ── AI Events ──
  AICompleted = 'ai.completed',
  AIFailed = 'ai.failed',
  AICreditsConsumed = 'ai.credits_consumed',
  AIModelChanged = 'ai.model_changed',

  // ── Billing Events ──
  PaymentCompleted = 'payment.completed',
  PaymentFailed = 'payment.failed',
  PaymentRefunded = 'payment.refunded',
  SubscriptionCreated = 'subscription.created',
  SubscriptionUpgraded = 'subscription.upgraded',
  SubscriptionDowngraded = 'subscription.downgraded',
  SubscriptionCancelled = 'subscription.cancelled',
  InvoiceGenerated = 'invoice.generated',

  // ── Attendance Events ──
  AttendanceMarked = 'attendance.marked',
  AttendanceAlertTriggered = 'attendance.alert_triggered',

  // ── Marketplace Events ──
  MarketplacePurchase = 'marketplace.purchase',
  MarketplaceRefund = 'marketplace.refund',
  MarketplaceReviewCreated = 'marketplace.review_created',
  MarketplaceProductPublished = 'marketplace.product_published',

  // ── System Events ──
  SystemHealthAlert = 'system.health_alert',
  SystemMaintenanceScheduled = 'system.maintenance_scheduled',
  BackupCompleted = 'system.backup_completed',
  DataExportRequested = 'system.data_export_requested',

  // ── Organization Events ──
  OrganizationCreated = 'organization.created',
  OrganizationUpdated = 'organization.updated',
  OrganizationMemberAdded = 'organization.member_added',
  OrganizationMemberRemoved = 'organization.member_removed',

  // ── Workflow Events ──
  WorkflowTriggered = 'workflow.triggered',
  WorkflowStepCompleted = 'workflow.step_completed',
  WorkflowCompleted = 'workflow.completed',
  WorkflowFailed = 'workflow.failed',

  // ── Certificate Events ──
  CertificateIssued = 'certificate.issued',

  // ── Notification Events ──
  NotificationSent = 'notification.sent',
}

// ──────────────────────────────────────────────────────────────
// Event Channels
// ──────────────────────────────────────────────────────────────

export type EventChannel =
  | 'sync'        // Immediate synchronous execution
  | 'async'       // Background async execution
  | 'webhook'     // External HTTP webhook dispatch
  | 'realtime'    // Supabase Realtime broadcast
  | 'analytics'   // Analytics pipeline

// ──────────────────────────────────────────────────────────────
// Event Source — Who triggered the event
// ──────────────────────────────────────────────────────────────

export interface EventSource {
  userId: string
  orgId?: string | null
  schoolId?: string | null
  role?: string | null
}

// ──────────────────────────────────────────────────────────────
// Event Metadata — Correlation, causation, versioning
// ──────────────────────────────────────────────────────────────

export interface EventMetadata {
  /** Correlation ID: groups related events in a single request flow */
  correlationId: string
  /** Causation ID: the event that directly caused this event */
  causationId?: string | null
  /** Schema version for backward compatibility */
  version: number
  /** Source service/module that emitted the event */
  emittedBy?: string | null
  /** Environment tag */
  environment?: string | null
}

// ──────────────────────────────────────────────────────────────
// Base Event — The core event structure
// ──────────────────────────────────────────────────────────────

export interface BaseEvent<T = unknown> {
  /** Unique event ID (UUID) */
  id: string
  /** Event type from the EventType enum */
  type: EventType
  /** ISO 8601 timestamp when event was created */
  timestamp: string
  /** Who triggered the event */
  source: EventSource
  /** Typed event payload */
  payload: T
  /** Correlation, causation, versioning metadata */
  metadata: EventMetadata
}

// ──────────────────────────────────────────────────────────────
// Event Handler Interface
// ──────────────────────────────────────────────────────────────

export interface EventHandler<T = unknown> {
  /** Unique handler ID */
  id: string
  /** Which event type this handler listens to */
  eventType: EventType
  /** The handler function — receives the event, returns a result */
  handler: (event: BaseEvent<T>) => Promise<HandlerResult>
  /** Execution priority (lower = earlier). Default 100 */
  priority: number
  /** Optional filter — if returns false, handler is skipped */
  filter?: (event: BaseEvent<T>) => boolean
  /** Which channel this handler runs on */
  channel: EventChannel
}

// ──────────────────────────────────────────────────────────────
// Handler Result
// ──────────────────────────────────────────────────────────────

export interface HandlerResult {
  /** Handler ID that produced this result */
  handlerId: string
  /** Whether the handler succeeded */
  success: boolean
  /** Optional error message if handler failed */
  error?: string | null
  /** Optional result data */
  data?: unknown
  /** Handler execution duration in ms */
  durationMs: number
}

// ──────────────────────────────────────────────────────────────
// Event Subscription — Persistent subscriber registration
// ──────────────────────────────────────────────────────────────

export interface EventSubscription {
  /** Unique subscription ID */
  id: string
  /** Who is subscribing (user/service ID) */
  subscriberId: string
  /** Which event types to listen to */
  eventTypes: EventType[]
  /** Optional filter function (serialized as JSON path expression) */
  filters?: EventFilter[]
  /** Which channels to receive events on */
  channels: EventChannel[]
  /** Whether this subscription is active */
  isActive: boolean
  /** Created timestamp */
  createdAt: string
  /** Updated timestamp */
  updatedAt: string
}

// ──────────────────────────────────────────────────────────────
// Event Filter — For subscription filtering
// ──────────────────────────────────────────────────────────────

export interface EventFilter {
  /** JSON path within the payload to check */
  path: string
  /** Comparison operator */
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'exists'
  /** Value to compare against */
  value: unknown
}

// ──────────────────────────────────────────────────────────────
// Event History — Persisted event record
// ──────────────────────────────────────────────────────────────

export interface EventHistory {
  /** Event ID */
  eventId: string
  /** Event type */
  eventType: EventType
  /** ISO timestamp */
  timestamp: string
  /** Source user ID */
  sourceUserId: string
  /** Source org ID */
  sourceOrgId?: string | null
  /** Source school ID */
  sourceSchoolId?: string | null
  /** Serialized event payload (JSON) */
  payload: string
  /** Correlation ID */
  correlationId: string
  /** Causation ID */
  causationId?: string | null
  /** Event version */
  version: number
  /** Handler execution results (JSON) */
  handlerResults: string
  /** Total processing duration in ms */
  durationMs: number
  /** Whether the event was processed successfully */
  success: boolean
}

// ──────────────────────────────────────────────────────────────
// Event Emit Result — What the emitter returns
// ──────────────────────────────────────────────────────────────

export interface EmitResult {
  /** The original event ID */
  eventId: string
  /** All handler results */
  handlerResults: HandlerResult[]
  /** Total processing duration in ms */
  durationMs: number
  /** Whether all handlers succeeded */
  success: boolean
  /** Any errors from failed handlers */
  errors: string[]
}

// ──────────────────────────────────────────────────────────────
// Event History Query Filters
// ──────────────────────────────────────────────────────────────

export interface EventHistoryFilters {
  eventType?: EventType
  eventTypes?: EventType[]
  sourceUserId?: string
  sourceSchoolId?: string
  sourceOrgId?: string
  correlationId?: string
  causationId?: string
  fromTimestamp?: string
  toTimestamp?: string
  successOnly?: boolean
  limit?: number
  offset?: number
}

// ──────────────────────────────────────────────────────────────
// Event Replay Config
// ──────────────────────────────────────────────────────────────

export interface ReplayConfig {
  /** Start timestamp for replay range */
  from: string
  /** End timestamp for replay range */
  to: string
  /** Optional event type filter */
  eventTypes?: EventType[]
  /** Optional correlation ID filter */
  correlationId?: string
  /** Whether to skip persisting replayed events (dry run) */
  dryRun?: boolean
  /** Maximum events to replay */
  limit?: number
}

// ──────────────────────────────────────────────────────────────
// Webhook Registration
// ──────────────────────────────────────────────────────────────

export interface WebhookRegistration {
  id: string
  url: string
  secret: string
  eventTypes: EventType[]
  isActive: boolean
  createdBy: string
  createdAt: string
}

// ──────────────────────────────────────────────────────────────
// Workflow Trigger Rule
// ──────────────────────────────────────────────────────────────

export interface WorkflowTriggerRule {
  id: string
  name: string
  eventType: EventType
  conditions?: EventFilter[]
  workflowId: string
  isActive: boolean
}

// ──────────────────────────────────────────────────────────────
// PAYLOAD TYPES — Typed payloads for each event
// ──────────────────────────────────────────────────────────────

// ── Student Payloads ──

export interface StudentCreatedPayload {
  studentId: string
  email: string
  fullName: string
  grade?: string | null
  classId?: string | null
}

export interface StudentEnrolledPayload {
  studentId: string
  schoolId: string
  classId: string
  enrolledAt: string
}

export interface StudentWithdrawnPayload {
  studentId: string
  schoolId: string
  reason?: string | null
  withdrawnAt: string
}

export interface StudentTransferredPayload {
  studentId: string
  fromSchoolId: string
  toSchoolId: string
  fromClassId?: string | null
  toClassId?: string | null
}

export interface StudentProfileUpdatedPayload {
  studentId: string
  changes: Record<string, unknown>
  previousValues: Record<string, unknown>
}

// ── Teacher Payloads ──

export interface TeacherCreatedPayload {
  teacherId: string
  email: string
  fullName: string
  subjects?: string[]
}

export interface TeacherAssignedPayload {
  teacherId: string
  classId: string
  subjectId?: string | null
  schoolId: string
}

export interface TeacherUnassignedPayload {
  teacherId: string
  classId: string
  subjectId?: string | null
  schoolId: string
}

export interface TeacherProfileUpdatedPayload {
  teacherId: string
  changes: Record<string, unknown>
  previousValues: Record<string, unknown>
}

// ── Parent Payloads ──

export interface ParentCreatedPayload {
  parentId: string
  email: string
  fullName: string
  phone?: string | null
}

export interface ParentLinkedToStudentPayload {
  parentId: string
  studentId: string
  relationship: string
}

export interface ParentUnlinkedFromStudentPayload {
  parentId: string
  studentId: string
}

// ── Exam Payloads ──

export interface ExamCreatedPayload {
  examId: string
  title: string
  schoolId: string
  createdBy: string
  questionCount: number
  examBody?: string | null
}

export interface ExamPublishedPayload {
  examId: string
  title: string
  schoolId: string
  publishedBy: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
}

export interface ExamStartedPayload {
  examId: string
  studentId: string
  startedAt: string
}

export interface ExamSubmittedPayload {
  examId: string
  studentId: string
  submittedAt: string
  durationMs: number
  questionAnswered: number
  questionTotal: number
}

export interface ExamGradedPayload {
  examId: string
  studentId: string
  gradedBy: string
  score: number
  maxScore: number
  percentage: number
  gradedAt: string
}

export interface ExamArchivedPayload {
  examId: string
  archivedBy: string
}

export interface ExamCancelledPayload {
  examId: string
  cancelledBy: string
  reason?: string | null
}

// ── Question Payloads ──

export interface QuestionCreatedPayload {
  questionId: string
  examId?: string | null
  questionType: string
  difficulty: string
  createdBy: string
}

export interface QuestionGeneratedPayload {
  questionId: string
  generationId: string
  questionType: string
  difficulty: string
  prompt: string
  model: string
  tokensUsed: number
}

export interface QuestionUpdatedPayload {
  questionId: string
  changes: Record<string, unknown>
  previousValues: Record<string, unknown>
}

export interface QuestionDeletedPayload {
  questionId: string
  deletedBy: string
  reason?: string | null
}

// ── AI Payloads ──

export interface AICompletedPayload {
  generationId: string
  userId: string
  provider: string
  model: string
  tokensInput: number
  tokensOutput: number
  costUsd: number
  durationMs: number
}

export interface AIFailedPayload {
  generationId: string
  userId: string
  provider: string
  model: string
  errorMessage: string
  durationMs: number
}

export interface AICreditsConsumedPayload {
  userId: string
  schoolId?: string | null
  creditsUsed: number
  creditsRemaining: number
  operationType: string
}

export interface AIModelChangedPayload {
  previousModel: string
  newModel: string
  changedBy: string
  reason?: string | null
}

// ── Billing Payloads ──

export interface PaymentCompletedPayload {
  paymentId: string
  userId: string
  schoolId?: string | null
  amount: number
  currency: string
  channel: string
  reference: string
  description?: string | null
}

export interface PaymentFailedPayload {
  paymentId: string
  userId: string
  amount: number
  currency: string
  channel: string
  errorMessage: string
}

export interface PaymentRefundedPayload {
  paymentId: string
  refundId: string
  amount: number
  currency: string
  reason?: string | null
  refundedBy: string
}

export interface SubscriptionCreatedPayload {
  subscriptionId: string
  userId: string
  schoolId?: string | null
  plan: string
  billingModel: string
  amount: number
  currency: string
  trialEndsAt?: string | null
}

export interface SubscriptionUpgradedPayload {
  subscriptionId: string
  userId: string
  previousPlan: string
  newPlan: string
  newAmount: number
  currency: string
}

export interface SubscriptionDowngradedPayload {
  subscriptionId: string
  userId: string
  previousPlan: string
  newPlan: string
  newAmount: number
  currency: string
}

export interface SubscriptionCancelledPayload {
  subscriptionId: string
  userId: string
  reason?: string | null
  cancelledAt: string
  effectiveAt: string
}

export interface InvoiceGeneratedPayload {
  invoiceId: string
  userId: string
  schoolId?: string | null
  amount: number
  currency: string
  dueDate: string
  lineItems: Array<{ description: string; amount: number; quantity: number }>
}

// ── Attendance Payloads ──

export interface AttendanceMarkedPayload {
  attendanceId: string
  studentId: string
  classId: string
  schoolId: string
  date: string
  status: string
  markedBy: string
}

export interface AttendanceAlertTriggeredPayload {
  studentId: string
  schoolId: string
  consecutiveAbsences: number
  totalAbsences: number
  alertType: string
}

// ── Marketplace Payloads ──

export interface MarketplacePurchasePayload {
  purchaseId: string
  buyerId: string
  productId: string
  productTitle: string
  amount: number
  currency: string
  sellerId: string
}

export interface MarketplaceRefundPayload {
  purchaseId: string
  refundId: string
  buyerId: string
  amount: number
  reason?: string | null
}

export interface MarketplaceReviewCreatedPayload {
  reviewId: string
  productId: string
  reviewerId: string
  rating: number
  title?: string | null
}

export interface MarketplaceProductPublishedPayload {
  productId: string
  title: string
  sellerId: string
  productType: string
  price: number
}

// ── System Payloads ──

export interface SystemHealthAlertPayload {
  alertType: string
  severity: 'info' | 'warning' | 'critical'
  metric: string
  currentValue: number
  threshold: number
  message: string
}

export interface SystemMaintenanceScheduledPayload {
  maintenanceId: string
  scheduledStart: string
  scheduledEnd: string
  description: string
  affectedServices: string[]
}

export interface BackupCompletedPayload {
  backupId: string
  type: string
  sizeBytes: number
  durationMs: number
  success: boolean
}

export interface DataExportRequestedPayload {
  exportId: string
  requestedBy: string
  exportType: string
  format: string
  filters?: Record<string, unknown>
}

// ── Organization Payloads ──

export interface OrganizationCreatedPayload {
  orgId: string
  name: string
  createdBy: string
  type: string
}

export interface OrganizationUpdatedPayload {
  orgId: string
  changes: Record<string, unknown>
  previousValues: Record<string, unknown>
}

export interface OrganizationMemberAddedPayload {
  orgId: string
  userId: string
  role: string
  addedBy: string
}

export interface OrganizationMemberRemovedPayload {
  orgId: string
  userId: string
  removedBy: string
  reason?: string | null
}

// ── Workflow Payloads ──

export interface WorkflowTriggeredPayload {
  workflowId: string
  workflowName: string
  triggeredBy: string
  triggerEventId: string
  parameters?: Record<string, unknown>
}

export interface WorkflowStepCompletedPayload {
  workflowId: string
  stepId: string
  stepName: string
  stepIndex: number
  totalSteps: number
  result?: unknown
}

export interface WorkflowCompletedPayload {
  workflowId: string
  workflowName: string
  totalSteps: number
  durationMs: number
}

export interface WorkflowFailedPayload {
  workflowId: string
  workflowName: string
  failedStepId: string
  failedStepName: string
  errorMessage: string
}

// ── Certificate Payload ──

export interface CertificateIssuedPayload {
  certificateId: string
  studentId: string
  examId?: string | null
  title: string
  issuedBy: string
  issuedAt: string
}

// ── Notification Payload ──

export interface NotificationSentPayload {
  notificationId: string
  userId: string
  type: string
  channel: string
  title: string
  success: boolean
}

// ──────────────────────────────────────────────────────────────
// Event Type → Payload Mapping
// ──────────────────────────────────────────────────────────────

export interface EventPayloadMap {
  [EventType.StudentCreated]: StudentCreatedPayload
  [EventType.StudentEnrolled]: StudentEnrolledPayload
  [EventType.StudentWithdrawn]: StudentWithdrawnPayload
  [EventType.StudentTransferred]: StudentTransferredPayload
  [EventType.StudentProfileUpdated]: StudentProfileUpdatedPayload

  [EventType.TeacherCreated]: TeacherCreatedPayload
  [EventType.TeacherAssigned]: TeacherAssignedPayload
  [EventType.TeacherUnassigned]: TeacherUnassignedPayload
  [EventType.TeacherProfileUpdated]: TeacherProfileUpdatedPayload

  [EventType.ParentCreated]: ParentCreatedPayload
  [EventType.ParentLinkedToStudent]: ParentLinkedToStudentPayload
  [EventType.ParentUnlinkedFromStudent]: ParentUnlinkedFromStudentPayload

  [EventType.ExamCreated]: ExamCreatedPayload
  [EventType.ExamPublished]: ExamPublishedPayload
  [EventType.ExamStarted]: ExamStartedPayload
  [EventType.ExamSubmitted]: ExamSubmittedPayload
  [EventType.ExamGraded]: ExamGradedPayload
  [EventType.ExamArchived]: ExamArchivedPayload
  [EventType.ExamCancelled]: ExamCancelledPayload

  [EventType.QuestionCreated]: QuestionCreatedPayload
  [EventType.QuestionGenerated]: QuestionGeneratedPayload
  [EventType.QuestionUpdated]: QuestionUpdatedPayload
  [EventType.QuestionDeleted]: QuestionDeletedPayload

  [EventType.AICompleted]: AICompletedPayload
  [EventType.AIFailed]: AIFailedPayload
  [EventType.AICreditsConsumed]: AICreditsConsumedPayload
  [EventType.AIModelChanged]: AIModelChangedPayload

  [EventType.PaymentCompleted]: PaymentCompletedPayload
  [EventType.PaymentFailed]: PaymentFailedPayload
  [EventType.PaymentRefunded]: PaymentRefundedPayload
  [EventType.SubscriptionCreated]: SubscriptionCreatedPayload
  [EventType.SubscriptionUpgraded]: SubscriptionUpgradedPayload
  [EventType.SubscriptionDowngraded]: SubscriptionDowngradedPayload
  [EventType.SubscriptionCancelled]: SubscriptionCancelledPayload
  [EventType.InvoiceGenerated]: InvoiceGeneratedPayload

  [EventType.AttendanceMarked]: AttendanceMarkedPayload
  [EventType.AttendanceAlertTriggered]: AttendanceAlertTriggeredPayload

  [EventType.MarketplacePurchase]: MarketplacePurchasePayload
  [EventType.MarketplaceRefund]: MarketplaceRefundPayload
  [EventType.MarketplaceReviewCreated]: MarketplaceReviewCreatedPayload
  [EventType.MarketplaceProductPublished]: MarketplaceProductPublishedPayload

  [EventType.SystemHealthAlert]: SystemHealthAlertPayload
  [EventType.SystemMaintenanceScheduled]: SystemMaintenanceScheduledPayload
  [EventType.BackupCompleted]: BackupCompletedPayload
  [EventType.DataExportRequested]: DataExportRequestedPayload

  [EventType.OrganizationCreated]: OrganizationCreatedPayload
  [EventType.OrganizationUpdated]: OrganizationUpdatedPayload
  [EventType.OrganizationMemberAdded]: OrganizationMemberAddedPayload
  [EventType.OrganizationMemberRemoved]: OrganizationMemberRemovedPayload

  [EventType.WorkflowTriggered]: WorkflowTriggeredPayload
  [EventType.WorkflowStepCompleted]: WorkflowStepCompletedPayload
  [EventType.WorkflowCompleted]: WorkflowCompletedPayload
  [EventType.WorkflowFailed]: WorkflowFailedPayload

  [EventType.CertificateIssued]: CertificateIssuedPayload
  [EventType.NotificationSent]: NotificationSentPayload
}

// ──────────────────────────────────────────────────────────────
// Typed Event — Convenience type for fully typed events
// ──────────────────────────────────────────────────────────────

export type TypedEvent<E extends EventType = EventType> = BaseEvent<EventPayloadMap[E]> & {
  type: E
}

// ──────────────────────────────────────────────────────────────
// Event Category Groupings
// ──────────────────────────────────────────────────────────────

export const EventCategories = {
  Student: [
    EventType.StudentCreated,
    EventType.StudentEnrolled,
    EventType.StudentWithdrawn,
    EventType.StudentTransferred,
    EventType.StudentProfileUpdated,
  ],
  Teacher: [
    EventType.TeacherCreated,
    EventType.TeacherAssigned,
    EventType.TeacherUnassigned,
    EventType.TeacherProfileUpdated,
  ],
  Parent: [
    EventType.ParentCreated,
    EventType.ParentLinkedToStudent,
    EventType.ParentUnlinkedFromStudent,
  ],
  Exam: [
    EventType.ExamCreated,
    EventType.ExamPublished,
    EventType.ExamStarted,
    EventType.ExamSubmitted,
    EventType.ExamGraded,
    EventType.ExamArchived,
    EventType.ExamCancelled,
  ],
  Question: [
    EventType.QuestionCreated,
    EventType.QuestionGenerated,
    EventType.QuestionUpdated,
    EventType.QuestionDeleted,
  ],
  AI: [
    EventType.AICompleted,
    EventType.AIFailed,
    EventType.AICreditsConsumed,
    EventType.AIModelChanged,
  ],
  Billing: [
    EventType.PaymentCompleted,
    EventType.PaymentFailed,
    EventType.PaymentRefunded,
    EventType.SubscriptionCreated,
    EventType.SubscriptionUpgraded,
    EventType.SubscriptionDowngraded,
    EventType.SubscriptionCancelled,
    EventType.InvoiceGenerated,
  ],
  Attendance: [
    EventType.AttendanceMarked,
    EventType.AttendanceAlertTriggered,
  ],
  Marketplace: [
    EventType.MarketplacePurchase,
    EventType.MarketplaceRefund,
    EventType.MarketplaceReviewCreated,
    EventType.MarketplaceProductPublished,
  ],
  System: [
    EventType.SystemHealthAlert,
    EventType.SystemMaintenanceScheduled,
    EventType.BackupCompleted,
    EventType.DataExportRequested,
  ],
  Organization: [
    EventType.OrganizationCreated,
    EventType.OrganizationUpdated,
    EventType.OrganizationMemberAdded,
    EventType.OrganizationMemberRemoved,
  ],
  Workflow: [
    EventType.WorkflowTriggered,
    EventType.WorkflowStepCompleted,
    EventType.WorkflowCompleted,
    EventType.WorkflowFailed,
  ],
  Certificate: [EventType.CertificateIssued],
  Notification: [EventType.NotificationSent],
} as const

export type EventCategory = keyof typeof EventCategories
