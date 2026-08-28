// ============================================================================
// ExamForge AI — Feedback Validation Schemas
// ============================================================================
// Zod schemas for all feedback-related inputs. Every API route and service
// method MUST validate through these schemas before processing data.
// ============================================================================

import { z } from 'zod'

// ──────────────────────────────────────────────────────────────
// Enum Schemas
// ──────────────────────────────────────────────────────────────

export const feedbackTypeEnum = z.enum([
  'bug_report',
  'feature_request',
  'ai_rating',
  'result_dispute',
  'accessibility',
  'general',
])

export const feedbackSeverityEnum = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
])

export const feedbackStatusEnum = z.enum([
  'open',
  'investigating',
  'in_progress',
  'resolved',
  'dismissed',
  'duplicate',
])

export const feedbackPriorityEnum = z.enum([
  'low',
  'normal',
  'high',
  'urgent',
])

// ──────────────────────────────────────────────────────────────
// Context Schema
// ──────────────────────────────────────────────────────────────

export const feedbackContextSchema = z.object({
  route: z.string().max(500).optional(),
  userRole: z.enum(['student', 'parent', 'teacher', 'school_admin', 'super_admin']).optional(),
  browser: z.string().max(200).optional(),
  device: z.string().max(100).optional(),
  os: z.string().max(200).optional(),
  viewport: z.string().max(50).optional(),
  timestamp: z.string().datetime().optional(),
  sessionId: z.string().max(100).optional(),
})

// ──────────────────────────────────────────────────────────────
// Screenshot Schema
// ──────────────────────────────────────────────────────────────

export const feedbackScreenshotSchema = z.object({
  dataUrl: z.string().min(1).max(10_000_000), // 10MB max base64
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().min(1).max(5_242_880), // 5MB max
  mimeType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
})

// ──────────────────────────────────────────────────────────────
// AI Rating Schema
// ──────────────────────────────────────────────────────────────

export const aiRatingSchema = z.object({
  thumbsUp: z.boolean(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  comment: z.string().max(2000).optional().default(''),
  provider: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
}).strict()

// ──────────────────────────────────────────────────────────────
// Result Dispute Schema
// ──────────────────────────────────────────────────────────────

export const resultDisputeSchema = z.object({
  examId: z.string().uuid('Invalid exam ID format'),
  questionId: z.string().uuid('Invalid question ID format'),
  studentAnswer: z.string().min(1).max(10000),
  correctAnswer: z.string().min(1).max(10000),
  reason: z.string().min(10).max(5000, 'Reason must be between 10 and 5000 characters'),
  evidence: z.string().max(5000).optional().default(''),
}).strict()

// ──────────────────────────────────────────────────────────────
// Create Feedback Schema
// ──────────────────────────────────────────────────────────────

export const createFeedbackSchema = z.object({
  type: feedbackTypeEnum,
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must be at most 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(10000, 'Description must be at most 10000 characters'),
  severity: feedbackSeverityEnum.optional().default(3),
  priority: feedbackPriorityEnum.optional().default('normal'),
  schoolId: z.string().uuid().optional().nullable(),
  screenshots: z.array(feedbackScreenshotSchema).max(5, 'Maximum 5 screenshots allowed').optional(),
  context: feedbackContextSchema.optional(),
  aiRating: aiRatingSchema.optional(),
  resultDispute: resultDisputeSchema.optional(),
  tags: z.array(z.string().min(1).max(50)).max(10, 'Maximum 10 tags allowed').optional().default([]),
}).strict().superRefine((data, ctx) => {
  // ai_rating type requires aiRating data
  if (data.type === 'ai_rating' && !data.aiRating) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['aiRating'],
      message: 'AI rating data is required when type is ai_rating',
    })
  }

  // result_dispute type requires resultDispute data
  if (data.type === 'result_dispute' && !data.resultDispute) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['resultDispute'],
      message: 'Result dispute data is required when type is result_dispute',
    })
  }
})

// ──────────────────────────────────────────────────────────────
// Update Feedback Schema
// ──────────────────────────────────────────────────────────────

export const updateFeedbackSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(10000).optional(),
  severity: feedbackSeverityEnum.optional(),
  status: feedbackStatusEnum.optional(),
  priority: feedbackPriorityEnum.optional(),
  assigneeId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  duplicateOfId: z.string().uuid().optional().nullable(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
)

// ──────────────────────────────────────────────────────────────
// Add Comment Schema
// ──────────────────────────────────────────────────────────────

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment must be at most 5000 characters'),
  isInternal: z.boolean().optional().default(false),
}).strict()

// ──────────────────────────────────────────────────────────────
// Feedback Filters Schema (for GET query params)
// ──────────────────────────────────────────────────────────────

export const feedbackFiltersSchema = z.object({
  type: feedbackTypeEnum.optional(),
  status: feedbackStatusEnum.optional(),
  severity: feedbackSeverityEnum.optional(),
  priority: feedbackPriorityEnum.optional(),
  assigneeId: z.string().uuid().optional(),
  schoolId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'severity', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// ──────────────────────────────────────────────────────────────
// Status Transition Schema
// ──────────────────────────────────────────────────────────────

export const statusTransitionSchema = z.object({
  newStatus: feedbackStatusEnum,
  comment: z.string().max(2000).optional(),
}).strict()

// ──────────────────────────────────────────────────────────────
// Upload Schema
// ──────────────────────────────────────────────────────────────

export const uploadScreenshotSchema = z.object({
  feedbackId: z.string().uuid('Invalid feedback ID format'),
  screenshot: feedbackScreenshotSchema,
}).strict()
