// ============================================================================
// ExamForge AI — Workflow Automation Engine — Pre-Built Templates
// ============================================================================
// Production-ready workflow templates that cover common educational automation
// scenarios. Users can import these as starting points and customize them.
// ============================================================================

import type {
  WorkflowTemplate,
  WorkflowStep,
  WorkflowConnection,
  WorkflowVariable,
} from './types'

// ──────────────────────────────────────────────────────────────
// Helper: Create a step with standard defaults
// ──────────────────────────────────────────────────────────────

function step(
  id: string,
  type: 'trigger' | 'action',
  actionType: string,
  name: string,
  config: Record<string, unknown> = {},
  x: number = 0,
  y: number = 0
): WorkflowStep {
  return {
    id,
    type,
    actionType: actionType as WorkflowStep['actionType'],
    name,
    config,
    position: { x, y },
    connections: { input: [], output: [] },
    enabled: true,
  }
}

function connection(
  id: string,
  sourceStepId: string,
  targetStepId: string,
  sourceOutput: string = 'default',
  targetInput: string = 'default'
): WorkflowConnection {
  return { id, sourceStepId, sourceOutput, targetStepId, targetInput }
}

function variable(key: string, value: unknown, description?: string): WorkflowVariable {
  return { key, value, description, overridable: true }
}

// ──────────────────────────────────────────────────────────────
// 1. Exam Grading Pipeline
// Exam Submitted → AI Mark Paper → Generate Report → Notify Teacher → Notify Parent
// ──────────────────────────────────────────────────────────────

const examGradingPipeline: WorkflowTemplate = {
  id: 'exam-grading-pipeline',
  name: 'Exam Grading Pipeline',
  description: 'Automated exam grading workflow: when an exam is submitted, AI marks the paper, generates a performance report, and notifies both teacher and parent.',
  category: 'grading',
  icon: 'FileCheck',
  popularity: 100,
  tags: ['grading', 'automation', 'ai', 'notifications'],
  trigger: step('trigger-exam-submitted', 'trigger', 'exam_submitted', 'Exam Submitted', {}, 0, 0),
  actions: [
    step('action-ai-mark', 'action', 'ai_mark_paper', 'AI Mark Paper', { markingScheme: 'standard' }, 300, 0),
    step('action-gen-report', 'action', 'ai_generate_report', 'Generate Report', { promptTemplate: 'Generate a detailed performance report for this exam submission including strengths, weaknesses, and recommendations.' }, 600, 0),
    step('action-notify-teacher', 'action', 'notify_teacher', 'Notify Teacher', { notificationType: 'exam_result', priority: 'normal' }, 900, -100),
    step('action-notify-parent', 'action', 'notify_parent', 'Notify Parent', { notificationType: 'exam_result', priority: 'normal' }, 900, 100),
  ],
  connections: [
    connection('conn-1', 'trigger-exam-submitted', 'action-ai-mark'),
    connection('conn-2', 'action-ai-mark', 'action-gen-report'),
    connection('conn-3', 'action-gen-report', 'action-notify-teacher'),
    connection('conn-4', 'action-gen-report', 'action-notify-parent'),
  ],
  defaultConfig: {
    passThreshold: 50,
    reportFormat: 'detailed',
    notifyOnFailOnly: false,
  },
  variables: [
    variable('passThreshold', 50, 'Minimum score percentage to pass'),
    variable('reportFormat', 'detailed', 'Report format: detailed or summary'),
  ],
}

// ──────────────────────────────────────────────────────────────
// 2. Student Onboarding
// Student Created → Send Welcome Email → Assign Default Exams → Notify Teacher → Schedule Orientation
// ──────────────────────────────────────────────────────────────

const studentOnboarding: WorkflowTemplate = {
  id: 'student-onboarding',
  name: 'Student Onboarding',
  description: 'Automated onboarding for new students: sends welcome email, assigns default exams, notifies assigned teacher, and schedules orientation session.',
  category: 'onboarding',
  icon: 'UserPlus',
  popularity: 85,
  tags: ['onboarding', 'students', 'automation', 'email'],
  trigger: step('trigger-student-created', 'trigger', 'student_created', 'Student Created', {}, 0, 0),
  actions: [
    step('action-welcome-email', 'action', 'send_email', 'Send Welcome Email', { subject: 'Welcome to ExamForge!', templateId: 'welcome-student' }, 300, 0),
    step('action-assign-exams', 'action', 'update_database', 'Assign Default Exams', { operation: 'insert', table: 'exam_assignments' }, 600, 0),
    step('action-notify-teacher', 'action', 'notify_teacher', 'Notify Teacher', { notificationType: 'system', title: 'New Student Enrolled', priority: 'normal' }, 900, -100),
    step('action-schedule-orientation', 'action', 'schedule_intervention', 'Schedule Orientation', { interventionType: 'orientation', delayDays: 3 }, 900, 100),
  ],
  connections: [
    connection('conn-1', 'trigger-student-created', 'action-welcome-email'),
    connection('conn-2', 'action-welcome-email', 'action-assign-exams'),
    connection('conn-3', 'action-assign-exams', 'action-notify-teacher'),
    connection('conn-4', 'action-assign-exams', 'action-schedule-orientation'),
  ],
  defaultConfig: {
    orientationDelayDays: 3,
    defaultExamTemplates: [],
    welcomeEmailTemplateId: 'welcome-student',
  },
  variables: [
    variable('orientationDelayDays', 3, 'Days after enrollment to schedule orientation'),
    variable('defaultExamTemplates', [], 'Default exam template IDs to assign'),
  ],
}

// ──────────────────────────────────────────────────────────────
// 3. At-Risk Intervention
// AI Risk Detected → Notify Teacher → Notify Parent → Schedule Intervention → Create Improvement Plan
// ──────────────────────────────────────────────────────────────

const atRiskIntervention: WorkflowTemplate = {
  id: 'at-risk-intervention',
  name: 'At-Risk Student Intervention',
  description: 'Automated intervention workflow: when AI detects an at-risk student, notifies teacher and parent, schedules an intervention meeting, and creates an improvement plan.',
  category: 'intervention',
  icon: 'AlertTriangle',
  popularity: 95,
  tags: ['intervention', 'at-risk', 'ai', 'notifications', 'critical'],
  trigger: step('trigger-ai-risk', 'trigger', 'ai_completed', 'AI Risk Detected', { riskThreshold: 'high' }, 0, 0),
  actions: [
    step('action-notify-teacher', 'action', 'notify_teacher', 'Notify Teacher', { notificationType: 'ai_generation', title: 'At-Risk Student Alert', priority: 'high' }, 300, 0),
    step('action-notify-parent', 'action', 'notify_parent', 'Notify Parent', { notificationType: 'ai_generation', title: 'Your Child Needs Additional Support', priority: 'high' }, 300, 200),
    step('action-schedule-intervention', 'action', 'schedule_intervention', 'Schedule Intervention', { interventionType: 'academic_support', delayDays: 2 }, 600, 100),
    step('action-suggest-intervention', 'action', 'ai_suggest_intervention', 'Create Improvement Plan', {}, 600, -100),
    step('action-log-audit', 'action', 'log_audit', 'Log Intervention', { action: 'intervention_created', entity: 'student' }, 900, 0),
  ],
  connections: [
    connection('conn-1', 'trigger-ai-risk', 'action-notify-teacher'),
    connection('conn-2', 'trigger-ai-risk', 'action-notify-parent'),
    connection('conn-3', 'action-notify-teacher', 'action-schedule-intervention'),
    connection('conn-4', 'action-notify-teacher', 'action-suggest-intervention'),
    connection('conn-5', 'action-schedule-intervention', 'action-log-audit'),
    connection('conn-6', 'action-suggest-intervention', 'action-log-audit'),
  ],
  defaultConfig: {
    riskThreshold: 'high',
    interventionDelayDays: 2,
    notifyParentImmediately: true,
  },
  variables: [
    variable('riskThreshold', 'high', 'Minimum risk level to trigger (low/medium/high/critical)'),
    variable('interventionDelayDays', 2, 'Days before scheduling intervention meeting'),
  ],
}

// ──────────────────────────────────────────────────────────────
// 4. Attendance Alert
// Absence Marked → If Chronic → Notify Parent → Notify Counselor → Flag for Review
// ──────────────────────────────────────────────────────────────

const attendanceAlert: WorkflowTemplate = {
  id: 'attendance-alert',
  name: 'Chronic Absence Alert',
  description: 'Monitors attendance patterns and triggers alerts when chronic absence is detected: notifies parent, alerts school counselor, and flags the student for administrative review.',
  category: 'attendance',
  icon: 'Clock',
  popularity: 80,
  tags: ['attendance', 'alerts', 'notifications', 'parent-engagement'],
  trigger: step('trigger-attendance', 'trigger', 'attendance_marked', 'Attendance Marked', {}, 0, 0),
  actions: [
    step('action-check-chronic', 'action', 'condition_check', 'Check if Chronic Absence', {
      condition: { field: 'trigger.absenceRate', operator: 'greater_than', value: 0.2 },
    }, 300, 0),
    step('action-notify-parent', 'action', 'notify_parent', 'Notify Parent', { notificationType: 'system', title: 'Attendance Concern', priority: 'high' }, 600, -150),
    step('action-notify-admin', 'action', 'notify_admin', 'Notify Counselor', { notificationType: 'system', title: 'Chronic Absence Alert', priority: 'high' }, 600, 0),
    step('action-flag-review', 'action', 'update_database', 'Flag for Review', { operation: 'update', table: 'profiles' }, 600, 150),
    step('action-log-audit', 'action', 'log_audit', 'Log Attendance Alert', { action: 'attendance_alert', entity: 'student' }, 900, 0),
  ],
  connections: [
    connection('conn-1', 'trigger-attendance', 'action-check-chronic'),
    connection('conn-2', 'action-check-chronic', 'action-notify-parent', 'true'),
    connection('conn-3', 'action-check-chronic', 'action-notify-admin', 'true'),
    connection('conn-4', 'action-check-chronic', 'action-flag-review', 'true'),
    connection('conn-5', 'action-notify-admin', 'action-log-audit'),
  ],
  defaultConfig: {
    chronicAbsenceThreshold: 0.2,
    alertCooldownDays: 3,
  },
  variables: [
    variable('chronicAbsenceThreshold', 0.2, 'Absence rate threshold to trigger chronic alert (e.g., 0.2 = 20%)'),
    variable('alertCooldownDays', 3, 'Minimum days between alerts for the same student'),
  ],
}

// ──────────────────────────────────────────────────────────────
// 5. Payment Flow
// Payment Completed → Generate Receipt → Update Records → Send Confirmation → If First Payment → Trigger Onboarding
// ──────────────────────────────────────────────────────────────

const paymentFlow: WorkflowTemplate = {
  id: 'payment-flow',
  name: 'Payment Processing Flow',
  description: 'Automated payment processing: generates receipt, updates financial records, sends confirmation, and triggers student onboarding for first-time payments.',
  category: 'billing',
  icon: 'CreditCard',
  popularity: 75,
  tags: ['payment', 'billing', 'automation', 'receipts'],
  trigger: step('trigger-payment', 'trigger', 'payment_completed', 'Payment Completed', {}, 0, 0),
  actions: [
    step('action-gen-invoice', 'action', 'generate_invoice', 'Generate Receipt', {}, 300, 0),
    step('action-update-records', 'action', 'update_database', 'Update Payment Records', { operation: 'update', table: 'fee_assignments' }, 600, 0),
    step('action-send-confirmation', 'action', 'send_email', 'Send Payment Confirmation', { subject: 'Payment Confirmation', templateId: 'payment-confirmation' }, 900, 0),
    step('action-check-first', 'action', 'condition_check', 'Is First Payment?', {
      condition: { field: 'trigger.isFirstPayment', operator: 'is_true' },
    }, 1200, 0),
    step('action-trigger-onboarding', 'action', 'update_database', 'Trigger Student Onboarding', { operation: 'update', table: 'profiles' }, 1500, 0),
    step('action-log-audit', 'action', 'log_audit', 'Log Payment', { action: 'payment_completed', entity: 'payment' }, 1200, 150),
  ],
  connections: [
    connection('conn-1', 'trigger-payment', 'action-gen-invoice'),
    connection('conn-2', 'action-gen-invoice', 'action-update-records'),
    connection('conn-3', 'action-update-records', 'action-send-confirmation'),
    connection('conn-4', 'action-send-confirmation', 'action-check-first'),
    connection('conn-5', 'action-check-first', 'action-trigger-onboarding', 'true'),
    connection('conn-6', 'action-update-records', 'action-log-audit'),
  ],
  defaultConfig: {
    sendReceiptEmail: true,
    triggerOnboardingOnFirst: true,
    receiptTemplateId: 'payment-receipt',
  },
  variables: [
    variable('sendReceiptEmail', true, 'Whether to email receipt to payer'),
    variable('triggerOnboardingOnFirst', true, 'Whether to trigger onboarding on first payment'),
  ],
}

// ──────────────────────────────────────────────────────────────
// 6. Certificate Issuance
// Exam Graded (if passed) → Issue Certificate → Update Transcript → Notify Student → Notify Parent
// ──────────────────────────────────────────────────────────────

const certificateIssuance: WorkflowTemplate = {
  id: 'certificate-issuance',
  name: 'Certificate Issuance',
  description: 'Automated certification: when an exam is graded and the student passes, issues a certificate, updates their transcript, and notifies both student and parent.',
  category: 'certification',
  icon: 'Award',
  popularity: 90,
  tags: ['certification', 'transcript', 'achievement', 'notifications'],
  trigger: step('trigger-exam-graded', 'trigger', 'exam_submitted', 'Exam Graded', {}, 0, 0),
  actions: [
    step('action-check-pass', 'action', 'condition_check', 'Check if Passed', {
      condition: { field: 'trigger.percentage', operator: 'greater_or_equal', value: 50 },
    }, 300, 0),
    step('action-issue-cert', 'action', 'issue_certificate', 'Issue Certificate', { passThreshold: 50 }, 600, -100),
    step('action-update-transcript', 'action', 'update_transcript', 'Update Transcript', {}, 900, -100),
    step('action-notify-student', 'action', 'notify_user', 'Notify Student', { notificationType: 'certificate_issued', title: 'Certificate Issued!', priority: 'normal' }, 1200, -200),
    step('action-notify-parent', 'action', 'notify_parent', 'Notify Parent', { notificationType: 'certificate_issued', title: 'Your Child Earned a Certificate!', priority: 'normal' }, 1200, 0),
    step('action-log-audit', 'action', 'log_audit', 'Log Certificate', { action: 'certificate_issued', entity: 'certificate' }, 1500, -100),
  ],
  connections: [
    connection('conn-1', 'trigger-exam-graded', 'action-check-pass'),
    connection('conn-2', 'action-check-pass', 'action-issue-cert', 'true'),
    connection('conn-3', 'action-issue-cert', 'action-update-transcript'),
    connection('conn-4', 'action-update-transcript', 'action-notify-student'),
    connection('conn-5', 'action-update-transcript', 'action-notify-parent'),
    connection('conn-6', 'action-update-transcript', 'action-log-audit'),
  ],
  defaultConfig: {
    passThreshold: 50,
    certificateTemplateId: 'default-achievement',
    updateTranscript: true,
  },
  variables: [
    variable('passThreshold', 50, 'Minimum score to pass and receive certificate'),
    variable('certificateTemplateId', 'default-achievement', 'Certificate template to use'),
  ],
}

// ──────────────────────────────────────────────────────────────
// 7. Weekly Report
// Schedule (weekly) → Aggregate Data → AI Generate Summary → Send to Admins → Archive
// ──────────────────────────────────────────────────────────────

const weeklyReport: WorkflowTemplate = {
  id: 'weekly-report',
  name: 'Weekly Performance Report',
  description: 'Automated weekly reporting: aggregates school performance data, uses AI to generate a comprehensive summary, sends it to administrators, and archives the report.',
  category: 'reporting',
  icon: 'BarChart3',
  popularity: 70,
  tags: ['reporting', 'ai', 'scheduled', 'analytics'],
  trigger: step('trigger-schedule', 'trigger', 'schedule', 'Schedule (Weekly)', { cron: '0 9 * * 1', timezone: 'Africa/Lagos' }, 0, 0),
  actions: [
    step('action-aggregate', 'action', 'update_database', 'Aggregate Data', { operation: 'insert', table: 'report_data' }, 300, 0),
    step('action-ai-summary', 'action', 'ai_generate_report', 'AI Generate Summary', { promptTemplate: 'Generate a comprehensive weekly school performance report including: attendance trends, exam performance, at-risk students, and recommendations for the coming week.' }, 600, 0),
    step('action-send-admins', 'action', 'notify_admin', 'Send to Admins', { notificationType: 'system', title: 'Weekly Report Ready', priority: 'normal' }, 900, 0),
    step('action-send-email', 'action', 'send_email', 'Email Report', { subject: 'Weekly Performance Report', templateId: 'weekly-report' }, 900, 150),
    step('action-archive', 'action', 'archive_records', 'Archive Report', {}, 1200, 75),
  ],
  connections: [
    connection('conn-1', 'trigger-schedule', 'action-aggregate'),
    connection('conn-2', 'action-aggregate', 'action-ai-summary'),
    connection('conn-3', 'action-ai-summary', 'action-send-admins'),
    connection('conn-4', 'action-ai-summary', 'action-send-email'),
    connection('conn-5', 'action-send-admins', 'action-archive'),
  ],
  defaultConfig: {
    scheduleDay: 'Monday',
    scheduleTime: '09:00',
    timezone: 'Africa/Lagos',
    includeAtRiskStudents: true,
    includeAttendanceTrends: true,
  },
  variables: [
    variable('scheduleDay', 'Monday', 'Day of week to generate report'),
    variable('scheduleTime', '09:00', 'Time to generate report (HH:mm)'),
    variable('timezone', 'Africa/Lagos', 'Timezone for scheduling'),
  ],
}

// ──────────────────────────────────────────────────────────────
// 8. Fee Reminder
// Schedule (daily) → Check Overdue Fees → Send Reminders → Escalate if 30+ days → Notify Admin
// ──────────────────────────────────────────────────────────────

const feeReminder: WorkflowTemplate = {
  id: 'fee-reminder',
  name: 'Overdue Fee Reminder',
  description: 'Automated fee collection workflow: daily check for overdue fees, sends reminders to parents, escalates after 30 days, and notifies administrators of severely overdue accounts.',
  category: 'billing',
  icon: 'Receipt',
  popularity: 65,
  tags: ['fees', 'billing', 'reminders', 'scheduled', 'escalation'],
  trigger: step('trigger-schedule', 'trigger', 'schedule', 'Schedule (Daily)', { cron: '0 8 * * *', timezone: 'Africa/Lagos' }, 0, 0),
  actions: [
    step('action-check-overdue', 'action', 'update_database', 'Check Overdue Fees', { operation: 'insert', table: 'fee_checks' }, 300, 0),
    step('action-send-reminder', 'action', 'send_email', 'Send Fee Reminders', { subject: 'Fee Payment Reminder', templateId: 'fee-reminder' }, 600, 0),
    step('action-notify-parent', 'action', 'notify_parent', 'Notify Parent', { notificationType: 'payment', title: 'Fee Payment Reminder', priority: 'high' }, 600, 150),
    step('action-check-escalation', 'action', 'condition_check', 'Check if 30+ Days Overdue', {
      condition: { field: 'trigger.daysOverdue', operator: 'greater_or_equal', value: 30 },
    }, 900, 0),
    step('action-notify-admin', 'action', 'notify_admin', 'Escalate to Admin', { notificationType: 'system', title: 'Severely Overdue Fee Account', priority: 'high' }, 1200, 0),
    step('action-log-audit', 'action', 'log_audit', 'Log Fee Check', { action: 'fee_reminder_sent', entity: 'fee_assignment' }, 1200, 150),
  ],
  connections: [
    connection('conn-1', 'trigger-schedule', 'action-check-overdue'),
    connection('conn-2', 'action-check-overdue', 'action-send-reminder'),
    connection('conn-3', 'action-check-overdue', 'action-notify-parent'),
    connection('conn-4', 'action-send-reminder', 'action-check-escalation'),
    connection('conn-5', 'action-check-escalation', 'action-notify-admin', 'true'),
    connection('conn-6', 'action-notify-parent', 'action-log-audit'),
  ],
  defaultConfig: {
    reminderSchedule: 'daily',
    reminderTime: '08:00',
    escalationDays: 30,
    timezone: 'Africa/Lagos',
  },
  variables: [
    variable('escalationDays', 30, 'Days overdue before escalation to admin'),
    variable('reminderSchedule', 'daily', 'How often to send reminders'),
    variable('timezone', 'Africa/Lagos', 'Timezone for scheduling'),
  ],
}

// ──────────────────────────────────────────────────────────────
// Export all templates
// ──────────────────────────────────────────────────────────────

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  examGradingPipeline,
  studentOnboarding,
  atRiskIntervention,
  attendanceAlert,
  paymentFlow,
  certificateIssuance,
  weeklyReport,
  feeReminder,
]

export {
  examGradingPipeline,
  studentOnboarding,
  atRiskIntervention,
  attendanceAlert,
  paymentFlow,
  certificateIssuance,
  weeklyReport,
  feeReminder,
}
