// ============================================================================
// ExamForge AI — Workflow Automation Engine Type Definitions
// ============================================================================
// Comprehensive type system for the visual workflow automation engine.
// Supports triggers, actions, connections, execution state, and human approval.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Trigger Types — Events that start a workflow
// ──────────────────────────────────────────────────────────────

export type WorkflowTriggerType =
  | 'exam_submitted'
  | 'exam_created'
  | 'exam_started'
  | 'student_enrolled'
  | 'student_created'
  | 'attendance_marked'
  | 'payment_completed'
  | 'payment_failed'
  | 'subscription_created'
  | 'question_generated'
  | 'ai_completed'
  | 'certificate_issued'
  | 'schedule'
  | 'webhook_received'
  | 'manual'
  | 'marketplace_purchase'

// ──────────────────────────────────────────────────────────────
// Action Types — Steps that execute within a workflow
// ──────────────────────────────────────────────────────────────

export type WorkflowActionType =
  | 'ai_mark_paper'
  | 'ai_generate_report'
  | 'ai_suggest_intervention'
  | 'ai_predict_risk'
  | 'ai_generate_questions'
  | 'notify_user'
  | 'notify_parent'
  | 'notify_teacher'
  | 'notify_admin'
  | 'send_email'
  | 'send_sms'
  | 'issue_certificate'
  | 'update_transcript'
  | 'recommend_revision'
  | 'schedule_intervention'
  | 'archive_records'
  | 'create_exam'
  | 'update_record'
  | 'http_request'
  | 'webhook_call'
  | 'delay'
  | 'condition_check'
  | 'loop_iterate'
  | 'human_approval'
  | 'branch_logic'
  | 'transform_data'
  | 'log_audit'
  | 'update_database'
  | 'generate_invoice'

// ──────────────────────────────────────────────────────────────
// Workflow & Step Status
// ──────────────────────────────────────────────────────────────

export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived' | 'error'

export type WorkflowStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'waiting_approval'
  | 'cancelled'

// ──────────────────────────────────────────────────────────────
// Approval Request Status
// ──────────────────────────────────────────────────────────────

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'

// ──────────────────────────────────────────────────────────────
// Retry Policy
// ──────────────────────────────────────────────────────────────

export interface RetryPolicy {
  maxRetries: number
  backoffMs: number
  backoffMultiplier: number
  maxBackoffMs: number
  retryableErrors: string[]
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffMs: 1000,
  backoffMultiplier: 2,
  maxBackoffMs: 60000,
  retryableErrors: ['timeout', 'rate_limit', 'connection_error', 'service_unavailable'],
}

// ──────────────────────────────────────────────────────────────
// Workflow Step
// ──────────────────────────────────────────────────────────────

export interface WorkflowStep {
  id: string
  type: 'trigger' | 'action'
  actionType: WorkflowTriggerType | WorkflowActionType
  name: string
  description?: string
  /** Step-specific configuration parameters */
  config: Record<string, unknown>
  /** Position in the visual editor canvas */
  position: { x: number; y: number }
  /** Connection IDs for input/output edges */
  connections: {
    input: string[]
    output: string[]
  }
  retryPolicy?: RetryPolicy
  timeoutMs?: number
  /** Whether this step is enabled (can be toggled without removal) */
  enabled?: boolean
}

// ──────────────────────────────────────────────────────────────
// Workflow Connection — Edges between steps
// ──────────────────────────────────────────────────────────────

export interface WorkflowConnection {
  id: string
  sourceStepId: string
  /** Output port name from source (e.g., "default", "true", "false") */
  sourceOutput: string
  targetStepId: string
  /** Input port name for target (e.g., "default", "items") */
  targetInput: string
}

// ──────────────────────────────────────────────────────────────
// Error Handling Configuration
// ──────────────────────────────────────────────────────────────

export interface WorkflowErrorHandling {
  /** What to do when a step fails: stop, skip, retry, continue */
  onFailure: 'stop' | 'skip' | 'retry' | 'continue'
  /** Maximum total execution time for the entire workflow (ms) */
  globalTimeoutMs: number
  /** Whether to send error notifications */
  notifyOnError: boolean
  /** User IDs to notify on workflow errors */
  notifyUserIds: string[]
  /** Whether to write failures to the dead letter queue */
  deadLetterQueue: boolean
}

export const DEFAULT_ERROR_HANDLING: WorkflowErrorHandling = {
  onFailure: 'stop',
  globalTimeoutMs: 3600000, // 1 hour
  notifyOnError: true,
  notifyUserIds: [],
  deadLetterQueue: true,
}

// ──────────────────────────────────────────────────────────────
// Workflow Variable
// ──────────────────────────────────────────────────────────────

export interface WorkflowVariable {
  key: string
  value: unknown
  description?: string
  /** Whether this variable can be overridden at execution time */
  overridable?: boolean
}

// ──────────────────────────────────────────────────────────────
// Workflow Definition — The full workflow blueprint
// ──────────────────────────────────────────────────────────────

export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  organizationId: string
  schoolId?: string | null
  /** The trigger step that starts this workflow */
  trigger: WorkflowStep
  /** Ordered action steps */
  actions: WorkflowStep[]
  /** Connections between steps */
  connections: WorkflowConnection[]
  /** Workflow-level variables */
  variables: WorkflowVariable[]
  /** Error handling configuration */
  errorHandling: WorkflowErrorHandling
  /** Current lifecycle status */
  status: WorkflowStatus
  /** Schema version for migrations */
  version: number
  /** User who created this workflow */
  createdBy: string
  /** ISO timestamp */
  createdAt: string
  /** ISO timestamp */
  updatedAt: string
  /** Soft delete flag */
  deletedAt?: string | null
  /** Tags for filtering and search */
  tags?: string[]
  /** Category for organization */
  category?: string
}

// ──────────────────────────────────────────────────────────────
// Workflow Execution — A single run of a workflow
// ──────────────────────────────────────────────────────────────

export interface WorkflowExecution {
  id: string
  workflowId: string
  /** The event data that triggered this execution */
  triggerEvent: {
    type: WorkflowTriggerType
    data: Record<string, unknown>
    timestamp: string
  }
  /** Results from each step that has executed */
  steps: WorkflowStepExecution[]
  /** Current overall status */
  status: WorkflowStepStatus
  /** When execution started */
  startedAt: string
  /** When execution completed (or failed) */
  completedAt?: string | null
  /** Error details if execution failed */
  error?: string | null
  /** Organization scope */
  organizationId: string
  schoolId?: string | null
  /** Total execution time in ms */
  durationMs?: number | null
}

// ──────────────────────────────────────────────────────────────
// Workflow Step Execution — Result from a single step
// ──────────────────────────────────────────────────────────────

export interface WorkflowStepExecution {
  stepId: string
  status: WorkflowStepStatus
  /** Input data passed to this step */
  input: Record<string, unknown>
  /** Output data produced by this step */
  output: Record<string, unknown>
  /** How long this step took */
  durationMs: number
  /** Error message if step failed */
  error?: string | null
  /** Number of retry attempts made */
  retryCount?: number
  /** Whether human approval was requested during this step */
  approvalRequested?: boolean
  /** Who approved (if applicable) */
  approvedBy?: string | null
  /** When this step started */
  startedAt: string
  /** When this step completed */
  completedAt?: string | null
  /** Output port for routing (condition/branch steps) */
  outputPort?: string | null
}

// ──────────────────────────────────────────────────────────────
// Human Approval Request
// ──────────────────────────────────────────────────────────────

export interface HumanApprovalRequest {
  id: string
  workflowExecutionId: string
  stepId: string
  /** When the approval was requested */
  requestedAt: string
  /** User ID or role from whom approval is requested */
  requestedFrom: string
  /** Current approval status */
  status: ApprovalStatus
  /** User ID who approved/rejected */
  approvedBy?: string | null
  /** When the approval action was taken */
  approvedAt?: string | null
  /** Comments from the approver */
  comments?: string | null
  /** Context data shown to the approver */
  context?: Record<string, unknown>
  /** Expiration time for this approval request */
  expiresAt?: string | null
  /** Organization scope */
  organizationId: string
  schoolId?: string | null
}

// ──────────────────────────────────────────────────────────────
// Workflow Template — Pre-built workflow blueprints
// ──────────────────────────────────────────────────────────────

export type WorkflowTemplateCategory =
  | 'grading'
  | 'onboarding'
  | 'intervention'
  | 'attendance'
  | 'billing'
  | 'certification'
  | 'reporting'
  | 'compliance'
  | 'custom'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: WorkflowTemplateCategory
  /** The trigger step */
  trigger: WorkflowStep
  /** Template action steps */
  actions: WorkflowStep[]
  /** Template connections */
  connections: WorkflowConnection[]
  /** Default configuration values */
  defaultConfig: Record<string, unknown>
  /** Template variables */
  variables: WorkflowVariable[]
  /** Display icon name (Lucide icon) */
  icon?: string
  /** Popularity score for sorting */
  popularity?: number
  /** Tags for filtering */
  tags?: string[]
}

// ──────────────────────────────────────────────────────────────
// Workflow Execution Context — Runtime state during execution
// ──────────────────────────────────────────────────────────────

export interface WorkflowExecutionContext {
  /** The workflow definition being executed */
  workflow: WorkflowDefinition
  /** Current execution record */
  execution: WorkflowExecution
  /** Accumulated variables (workflow-level + step outputs) */
  variables: Record<string, unknown>
  /** Map of step ID → step output data */
  stepOutputs: Map<string, Record<string, unknown>>
  /** Map of step ID → step execution record */
  stepExecutions: Map<string, WorkflowStepExecution>
  /** The trigger event payload */
  triggerEvent: Record<string, unknown>
  /** Current step being executed */
  currentStepId?: string | null
  /** Cancellation flag */
  cancelled: boolean
}

// ──────────────────────────────────────────────────────────────
// Condition Definition — For condition_check and branch_logic
// ──────────────────────────────────────────────────────────────

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false'
  | 'in'
  | 'not_in'
  | 'regex_match'

export interface ConditionDefinition {
  /** Path to the value in the data context (dot notation, e.g., "trigger.studentId") */
  field?: string
  /** The comparison operator */
  operator?: ConditionOperator
  /** The value to compare against */
  value?: unknown
  /** For compound conditions */
  and?: ConditionDefinition[]
  /** For compound conditions */
  or?: ConditionDefinition[]
}

// ──────────────────────────────────────────────────────────────
// Workflow Stats
// ──────────────────────────────────────────────────────────────

export interface WorkflowStats {
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  successRate: number
  avgDurationMs: number
  maxDurationMs: number
  minDurationMs: number
  lastExecutedAt?: string | null
  lastStatus?: WorkflowStepStatus | null
  /** Step-level stats */
  stepStats: Record<string, {
    executions: number
    failures: number
    avgDurationMs: number
  }>
}

// ──────────────────────────────────────────────────────────────
// Workflow Validation Result
// ──────────────────────────────────────────────────────────────

export interface WorkflowValidationResult {
  valid: boolean
  errors: WorkflowValidationError[]
  warnings: WorkflowValidationWarning[]
}

export interface WorkflowValidationError {
  stepId?: string | null
  connectionId?: string | null
  code: string
  message: string
}

export interface WorkflowValidationWarning {
  stepId?: string | null
  code: string
  message: string
}

// ──────────────────────────────────────────────────────────────
// Step Executor Result
// ──────────────────────────────────────────────────────────────

export interface StepExecutorResult {
  success: boolean
  output: Record<string, unknown>
  error?: string | null
  /** If this step should route to a specific output port (for branching) */
  outputPort?: string
}

// ──────────────────────────────────────────────────────────────
// Pagination & Filters
// ──────────────────────────────────────────────────────────────

export interface WorkflowExecutionFilters {
  status?: WorkflowStepStatus
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  hasMore: boolean
}

// ──────────────────────────────────────────────────────────────
// Dead Letter Queue Entry
// ──────────────────────────────────────────────────────────────

export interface DeadLetterEntry {
  id: string
  workflowId: string
  executionId: string
  stepId: string
  error: string
  /** The input data that caused the failure */
  inputData: Record<string, unknown>
  /** Number of times this has been retried from DLQ */
  retryCount: number
  createdAt: string
  organizationId: string
  schoolId?: string | null
}
