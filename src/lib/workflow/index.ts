// ============================================================================
// ExamForge AI — Workflow Automation Engine — Central Exports
// ============================================================================
// Single entry point for the workflow automation engine.
// Import everything from '@/lib/workflow' for convenience.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type {
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowStatus,
  WorkflowStepStatus,
  ApprovalStatus,
  RetryPolicy,
  WorkflowStep,
  WorkflowConnection,
  WorkflowErrorHandling,
  WorkflowVariable,
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStepExecution,
  HumanApprovalRequest,
  WorkflowTemplateCategory,
  WorkflowTemplate,
  WorkflowExecutionContext,
  ConditionOperator,
  ConditionDefinition,
  WorkflowStats,
  WorkflowValidationResult,
  WorkflowValidationError,
  WorkflowValidationWarning,
  StepExecutorResult,
  WorkflowExecutionFilters,
  PaginatedResult,
  DeadLetterEntry,
} from './types'

export {
  DEFAULT_RETRY_POLICY,
  DEFAULT_ERROR_HANDLING,
} from './types'

// ──────────────────────────────────────────────────────────────
// Workflow Engine
// ──────────────────────────────────────────────────────────────

export { WorkflowEngine, workflowEngine } from './workflow-engine'

// ──────────────────────────────────────────────────────────────
// Workflow Service (CRUD + Management)
// ──────────────────────────────────────────────────────────────

export {
  createWorkflow,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  publishWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  getWorkflowExecutions,
  getWorkflowExecution,
  getWorkflowStats,
  getOrganizationWorkflows,
  importWorkflowTemplate,
  exportWorkflow,
  validateWorkflow,
  getAvailableTemplates,
  getTemplateById,
} from './workflow-service'

export type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
} from './workflow-service'

// ──────────────────────────────────────────────────────────────
// Workflow Templates
// ──────────────────────────────────────────────────────────────

export {
  WORKFLOW_TEMPLATES,
  examGradingPipeline,
  studentOnboarding,
  atRiskIntervention,
  attendanceAlert,
  paymentFlow,
  certificateIssuance,
  weeklyReport,
  feeReminder,
} from './workflow-templates'

// ──────────────────────────────────────────────────────────────
// Approval Service
// ──────────────────────────────────────────────────────────────

export {
  createApprovalRequest,
  getPendingApprovals,
  getApprovalRequest,
  approveExecution,
  rejectExecution,
  getApprovalHistory,
  getOrganizationApprovals,
  expireStaleApprovals,
} from './approval-service'

export type {
  CreateApprovalRequestInput,
} from './approval-service'
