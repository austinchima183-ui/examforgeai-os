// ============================================================================
// ExamForge AI — Feedback Module Barrel Exports
// ============================================================================
// Central export point for the feedback (Blocker 2) module.
// ============================================================================

// ── Types ─────────────────────────────────────────────────────
export type {
  FeedbackType,
  FeedbackSeverity,
  FeedbackStatus,
  FeedbackPriority,
  FeedbackContext,
  FeedbackScreenshot,
  AIResponseRating,
  ResultDispute,
  FeedbackItem,
  FeedbackCreateInput,
  FeedbackUpdateInput,
  FeedbackComment,
  FeedbackAssignment,
  FeedbackAnalytics,
  FeedbackFilters,
  FeedbackListResult,
} from './types'

// ── Validators ────────────────────────────────────────────────
export {
  feedbackTypeEnum,
  feedbackSeverityEnum,
  feedbackStatusEnum,
  feedbackPriorityEnum,
  feedbackContextSchema,
  feedbackScreenshotSchema,
  aiRatingSchema,
  resultDisputeSchema,
  createFeedbackSchema,
  updateFeedbackSchema,
  addCommentSchema,
  feedbackFiltersSchema,
  statusTransitionSchema,
  uploadScreenshotSchema,
} from './validators'

// ── Status Workflow ───────────────────────────────────────────
export {
  isValidTransition,
  getAllowedTransitions,
  getTransitionLabel,
  transitionFeedback,
  isActiveStatus,
  isTerminalStatus,
  STATUS_PRIORITY,
} from './status-workflow'

// ── Feedback Service ──────────────────────────────────────────
export {
  createFeedback,
  getFeedback,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
  addComment,
  getComments,
  assignFeedback,
  submitAIRating,
  submitResultDispute,
  getFeedbackAnalytics,
  uploadScreenshot,
} from './feedback-service'

// ── Client-Side Context Capture ──────────────────────────────
// Moved out of 'use server' file — sync function using browser APIs
export { captureContext } from './capture-context'

// ── Analytics Service ─────────────────────────────────────────
export {
  getFeedbackOverview,
  getFeedbackTrends,
  getFeedbackByCategory,
  getResolutionMetrics,
  getTopReporters,
  getAIRatingSummary,
} from './analytics-service'

export type {
  FeedbackOverview,
  FeedbackTrendPoint,
  FeedbackCategoryBreakdown,
  ResolutionMetrics,
  TopReporter,
  AIRatingSummary,
} from './analytics-service'
