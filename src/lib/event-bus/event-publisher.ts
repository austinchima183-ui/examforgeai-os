// ============================================================================
// ExamForge AI — High-Level Event Publishing API
// ============================================================================
// Developer-friendly functions for publishing events with typed payloads,
// auto-filled source from auth context, and auto-generated correlation IDs.
// Usage: await publishExamSubmitted({ examId, studentId, ... })
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { eventBus, createEvent } from './event-emitter'
import { EventType } from './types'
import type {
  BaseEvent,
  EmitResult,
  EventSource,
  EventPayloadMap,
} from './types'

// ──────────────────────────────────────────────────────────────
// Auth Context Resolution — Get current user from Supabase session
// ──────────────────────────────────────────────────────────────

async function resolveSource(override?: Partial<EventSource>): Promise<EventSource> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Extract schoolId and orgId from user metadata
      const metadata = user.user_metadata ?? {}
      return {
        userId: override?.userId ?? user.id,
        orgId: override?.orgId ?? metadata.orgId ?? null,
        schoolId: override?.schoolId ?? metadata.schoolId ?? null,
        role: override?.role ?? metadata.role ?? null,
      }
    }
  } catch {
    // If auth resolution fails, use override or fallback
  }

  return {
    userId: override?.userId ?? 'system',
    orgId: override?.orgId ?? null,
    schoolId: override?.schoolId ?? null,
    role: override?.role ?? null,
  }
}

// ──────────────────────────────────────────────────────────────
// Generic Publish Helper
// ──────────────────────────────────────────────────────────────

async function publish<E extends EventType>(
  type: E,
  payload: EventPayloadMap[E],
  sourceOverride?: Partial<EventSource>,
  options?: {
    correlationId?: string
    causationId?: string
    version?: number
    emittedBy?: string
  }
): Promise<EmitResult> {
  const source = await resolveSource(sourceOverride)
  const event: BaseEvent<EventPayloadMap[E]> = createEvent(type, payload, source, options)
  return eventBus.emit(event)
}

// ──────────────────────────────────────────────────────────────
// Student Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishStudentCreated(
  payload: EventPayloadMap[EventType.StudentCreated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.StudentCreated, payload, sourceOverride, { emittedBy: 'student-service' })
}

export async function publishStudentEnrolled(
  payload: EventPayloadMap[EventType.StudentEnrolled],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.StudentEnrolled, payload, sourceOverride, { emittedBy: 'student-service' })
}

export async function publishStudentWithdrawn(
  payload: EventPayloadMap[EventType.StudentWithdrawn],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.StudentWithdrawn, payload, sourceOverride, { emittedBy: 'student-service' })
}

export async function publishStudentTransferred(
  payload: EventPayloadMap[EventType.StudentTransferred],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.StudentTransferred, payload, sourceOverride, { emittedBy: 'student-service' })
}

export async function publishStudentProfileUpdated(
  payload: EventPayloadMap[EventType.StudentProfileUpdated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.StudentProfileUpdated, payload, sourceOverride, { emittedBy: 'student-service' })
}

// ──────────────────────────────────────────────────────────────
// Teacher Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishTeacherCreated(
  payload: EventPayloadMap[EventType.TeacherCreated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.TeacherCreated, payload, sourceOverride, { emittedBy: 'teacher-service' })
}

export async function publishTeacherAssigned(
  payload: EventPayloadMap[EventType.TeacherAssigned],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.TeacherAssigned, payload, sourceOverride, { emittedBy: 'teacher-service' })
}

export async function publishTeacherUnassigned(
  payload: EventPayloadMap[EventType.TeacherUnassigned],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.TeacherUnassigned, payload, sourceOverride, { emittedBy: 'teacher-service' })
}

export async function publishTeacherProfileUpdated(
  payload: EventPayloadMap[EventType.TeacherProfileUpdated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.TeacherProfileUpdated, payload, sourceOverride, { emittedBy: 'teacher-service' })
}

// ──────────────────────────────────────────────────────────────
// Parent Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishParentCreated(
  payload: EventPayloadMap[EventType.ParentCreated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.ParentCreated, payload, sourceOverride, { emittedBy: 'parent-service' })
}

export async function publishParentLinkedToStudent(
  payload: EventPayloadMap[EventType.ParentLinkedToStudent],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.ParentLinkedToStudent, payload, sourceOverride, { emittedBy: 'parent-service' })
}

export async function publishParentUnlinkedFromStudent(
  payload: EventPayloadMap[EventType.ParentUnlinkedFromStudent],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.ParentUnlinkedFromStudent, payload, sourceOverride, { emittedBy: 'parent-service' })
}

// ──────────────────────────────────────────────────────────────
// Exam Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishExamCreated(
  payload: EventPayloadMap[EventType.ExamCreated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.ExamCreated, payload, sourceOverride, { emittedBy: 'exam-service' })
}

export async function publishExamPublished(
  payload: EventPayloadMap[EventType.ExamPublished],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.ExamPublished, payload, sourceOverride, { emittedBy: 'exam-service' })
}

export async function publishExamStarted(
  payload: EventPayloadMap[EventType.ExamStarted],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.ExamStarted, payload, sourceOverride, { emittedBy: 'cbt-service' })
}

export async function publishExamSubmitted(
  payload: EventPayloadMap[EventType.ExamSubmitted],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.ExamSubmitted, payload, sourceOverride, { emittedBy: 'cbt-service' })
}

export async function publishExamGraded(
  payload: EventPayloadMap[EventType.ExamGraded],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.ExamGraded, payload, sourceOverride, { emittedBy: 'grading-service' })
}

export async function publishExamArchived(
  payload: EventPayloadMap[EventType.ExamArchived],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.ExamArchived, payload, sourceOverride, { emittedBy: 'exam-service' })
}

export async function publishExamCancelled(
  payload: EventPayloadMap[EventType.ExamCancelled],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.ExamCancelled, payload, sourceOverride, { emittedBy: 'exam-service' })
}

// ──────────────────────────────────────────────────────────────
// Question Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishQuestionCreated(
  payload: EventPayloadMap[EventType.QuestionCreated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.QuestionCreated, payload, sourceOverride, { emittedBy: 'question-service' })
}

export async function publishQuestionGenerated(
  payload: EventPayloadMap[EventType.QuestionGenerated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.QuestionGenerated, payload, sourceOverride, { emittedBy: 'ai-engine' })
}

export async function publishQuestionUpdated(
  payload: EventPayloadMap[EventType.QuestionUpdated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.QuestionUpdated, payload, sourceOverride, { emittedBy: 'question-service' })
}

export async function publishQuestionDeleted(
  payload: EventPayloadMap[EventType.QuestionDeleted],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.QuestionDeleted, payload, sourceOverride, { emittedBy: 'question-service' })
}

// ──────────────────────────────────────────────────────────────
// AI Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishAICompleted(
  payload: EventPayloadMap[EventType.AICompleted],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.AICompleted, payload, sourceOverride, { emittedBy: 'ai-engine' })
}

export async function publishAIFailed(
  payload: EventPayloadMap[EventType.AIFailed],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.AIFailed, payload, sourceOverride, { emittedBy: 'ai-engine' })
}

export async function publishAICreditsConsumed(
  payload: EventPayloadMap[EventType.AICreditsConsumed],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.AICreditsConsumed, payload, sourceOverride, { emittedBy: 'ai-engine' })
}

export async function publishAIModelChanged(
  payload: EventPayloadMap[EventType.AIModelChanged],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.AIModelChanged, payload, sourceOverride, { emittedBy: 'ai-engine' })
}

// ──────────────────────────────────────────────────────────────
// Billing Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishPaymentCompleted(
  payload: EventPayloadMap[EventType.PaymentCompleted],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.PaymentCompleted, payload, sourceOverride, { emittedBy: 'billing-service' })
}

export async function publishPaymentFailed(
  payload: EventPayloadMap[EventType.PaymentFailed],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.PaymentFailed, payload, sourceOverride, { emittedBy: 'billing-service' })
}

export async function publishPaymentRefunded(
  payload: EventPayloadMap[EventType.PaymentRefunded],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.PaymentRefunded, payload, sourceOverride, { emittedBy: 'billing-service' })
}

export async function publishSubscriptionCreated(
  payload: EventPayloadMap[EventType.SubscriptionCreated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.SubscriptionCreated, payload, sourceOverride, { emittedBy: 'billing-service' })
}

export async function publishSubscriptionUpgraded(
  payload: EventPayloadMap[EventType.SubscriptionUpgraded],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.SubscriptionUpgraded, payload, sourceOverride, { emittedBy: 'billing-service' })
}

export async function publishSubscriptionDowngraded(
  payload: EventPayloadMap[EventType.SubscriptionDowngraded],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.SubscriptionDowngraded, payload, sourceOverride, { emittedBy: 'billing-service' })
}

export async function publishSubscriptionCancelled(
  payload: EventPayloadMap[EventType.SubscriptionCancelled],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.SubscriptionCancelled, payload, sourceOverride, { emittedBy: 'billing-service' })
}

export async function publishInvoiceGenerated(
  payload: EventPayloadMap[EventType.InvoiceGenerated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.InvoiceGenerated, payload, sourceOverride, { emittedBy: 'billing-service' })
}

// ──────────────────────────────────────────────────────────────
// Attendance Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishAttendanceMarked(
  payload: EventPayloadMap[EventType.AttendanceMarked],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.AttendanceMarked, payload, sourceOverride, { emittedBy: 'attendance-service' })
}

export async function publishAttendanceAlertTriggered(
  payload: EventPayloadMap[EventType.AttendanceAlertTriggered],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.AttendanceAlertTriggered, payload, sourceOverride, { emittedBy: 'attendance-service' })
}

// ──────────────────────────────────────────────────────────────
// Marketplace Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishMarketplacePurchase(
  payload: EventPayloadMap[EventType.MarketplacePurchase],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.MarketplacePurchase, payload, sourceOverride, { emittedBy: 'marketplace-service' })
}

export async function publishMarketplaceRefund(
  payload: EventPayloadMap[EventType.MarketplaceRefund],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.MarketplaceRefund, payload, sourceOverride, { emittedBy: 'marketplace-service' })
}

export async function publishMarketplaceReviewCreated(
  payload: EventPayloadMap[EventType.MarketplaceReviewCreated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.MarketplaceReviewCreated, payload, sourceOverride, { emittedBy: 'marketplace-service' })
}

export async function publishMarketplaceProductPublished(
  payload: EventPayloadMap[EventType.MarketplaceProductPublished],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.MarketplaceProductPublished, payload, sourceOverride, { emittedBy: 'marketplace-service' })
}

// ──────────────────────────────────────────────────────────────
// System Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishSystemHealthAlert(
  payload: EventPayloadMap[EventType.SystemHealthAlert],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.SystemHealthAlert, payload, sourceOverride, { emittedBy: 'monitoring' })
}

export async function publishSystemMaintenanceScheduled(
  payload: EventPayloadMap[EventType.SystemMaintenanceScheduled],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.SystemMaintenanceScheduled, payload, sourceOverride, { emittedBy: 'operations' })
}

export async function publishBackupCompleted(
  payload: EventPayloadMap[EventType.BackupCompleted],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.BackupCompleted, payload, sourceOverride, { emittedBy: 'operations' })
}

export async function publishDataExportRequested(
  payload: EventPayloadMap[EventType.DataExportRequested],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.DataExportRequested, payload, sourceOverride, { emittedBy: 'data-service' })
}

// ──────────────────────────────────────────────────────────────
// Organization Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishOrganizationCreated(
  payload: EventPayloadMap[EventType.OrganizationCreated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.OrganizationCreated, payload, sourceOverride, { emittedBy: 'org-service' })
}

export async function publishOrganizationUpdated(
  payload: EventPayloadMap[EventType.OrganizationUpdated],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.OrganizationUpdated, payload, sourceOverride, { emittedBy: 'org-service' })
}

export async function publishOrganizationMemberAdded(
  payload: EventPayloadMap[EventType.OrganizationMemberAdded],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.OrganizationMemberAdded, payload, sourceOverride, { emittedBy: 'org-service' })
}

export async function publishOrganizationMemberRemoved(
  payload: EventPayloadMap[EventType.OrganizationMemberRemoved],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.OrganizationMemberRemoved, payload, sourceOverride, { emittedBy: 'org-service' })
}

// ──────────────────────────────────────────────────────────────
// Workflow Event Publishers
// ──────────────────────────────────────────────────────────────

export async function publishWorkflowTriggered(
  payload: EventPayloadMap[EventType.WorkflowTriggered],
  sourceOverride?: Partial<EventSource>,
  correlationId?: string
): Promise<EmitResult> {
  return publish(EventType.WorkflowTriggered, payload, sourceOverride, {
    emittedBy: 'workflow-engine',
    correlationId,
  })
}

export async function publishWorkflowStepCompleted(
  payload: EventPayloadMap[EventType.WorkflowStepCompleted],
  sourceOverride?: Partial<EventSource>,
  correlationId?: string
): Promise<EmitResult> {
  return publish(EventType.WorkflowStepCompleted, payload, sourceOverride, {
    emittedBy: 'workflow-engine',
    correlationId,
  })
}

export async function publishWorkflowCompleted(
  payload: EventPayloadMap[EventType.WorkflowCompleted],
  sourceOverride?: Partial<EventSource>,
  correlationId?: string
): Promise<EmitResult> {
  return publish(EventType.WorkflowCompleted, payload, sourceOverride, {
    emittedBy: 'workflow-engine',
    correlationId,
  })
}

export async function publishWorkflowFailed(
  payload: EventPayloadMap[EventType.WorkflowFailed],
  sourceOverride?: Partial<EventSource>,
  correlationId?: string
): Promise<EmitResult> {
  return publish(EventType.WorkflowFailed, payload, sourceOverride, {
    emittedBy: 'workflow-engine',
    correlationId,
  })
}

// ──────────────────────────────────────────────────────────────
// Certificate Event Publisher
// ──────────────────────────────────────────────────────────────

export async function publishCertificateIssued(
  payload: EventPayloadMap[EventType.CertificateIssued],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.CertificateIssued, payload, sourceOverride, { emittedBy: 'certificate-service' })
}

// ──────────────────────────────────────────────────────────────
// Notification Event Publisher
// ──────────────────────────────────────────────────────────────

export async function publishNotificationSent(
  payload: EventPayloadMap[EventType.NotificationSent],
  sourceOverride?: Partial<EventSource>
): Promise<EmitResult> {
  return publish(EventType.NotificationSent, payload, sourceOverride, { emittedBy: 'notification-service' })
}

// ──────────────────────────────────────────────────────────────
// Generic Publisher — For dynamic event publishing
// ──────────────────────────────────────────────────────────────

export async function publishEvent(
  type: EventType,
  payload: unknown,
  sourceOverride?: Partial<EventSource>,
  options?: {
    correlationId?: string
    causationId?: string
    version?: number
    emittedBy?: string
  }
): Promise<EmitResult> {
  return publish(type, payload as EventPayloadMap[typeof type], sourceOverride, options)
}
