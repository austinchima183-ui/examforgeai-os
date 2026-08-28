// ============================================================================
// ExamForge AI — Question Zod Schemas
// ============================================================================
// Validation schemas for question creation and update operations.
// Supports all question types used in the CBT engine.
// ============================================================================

import { z } from 'zod';
import type { QuestionType, DifficultyLevel } from '@/lib/types';

// ──────────────────────────────────────────────────────────────
// Question Option Schema
// ──────────────────────────────────────────────────────────────

export const questionOptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Option label is required'),
  content: z.string().min(1, 'Option content is required'),
  isCorrect: z.boolean().optional(),
});

export type QuestionOptionInput = z.infer<typeof questionOptionSchema>;

// ──────────────────────────────────────────────────────────────
// Question Type Enum
// ──────────────────────────────────────────────────────────────

export const questionTypeEnum = z.enum([
  'single_choice',
  'multi_choice',
  'multi_select',
  'true_false',
  'short_answer',
  'essay',
  'fill_blank',
  'matching',
  'ordering',
] as const satisfies readonly QuestionType[]);

// ──────────────────────────────────────────────────────────────
// Difficulty Level Enum
// ──────────────────────────────────────────────────────────────

export const difficultyLevelEnum = z.enum([
  'easy',
  'medium',
  'hard',
  'expert',
] as const satisfies readonly DifficultyLevel[]);

// ──────────────────────────────────────────────────────────────
// Create Question Schema
// ──────────────────────────────────────────────────────────────

export const createQuestionSchema = z.object({
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be at most 200 characters'),
  topic: z
    .string()
    .min(1, 'Topic is required')
    .max(200, 'Topic must be at most 200 characters'),
  type: questionTypeEnum,
  content: z
    .string()
    .min(1, 'Question content is required')
    .max(10000, 'Question content must be at most 10,000 characters'),
  options: z
    .array(questionOptionSchema)
    .optional(),
  correctAnswer: z
    .string()
    .min(1, 'Correct answer is required'),
  difficulty: difficultyLevelEnum,
  marks: z
    .number()
    .int('Marks must be a whole number')
    .min(1, 'Marks must be at least 1')
    .max(100, 'Marks must be at most 100'),
  explanation: z
    .string()
    .max(5000, 'Explanation must be at most 5,000 characters')
    .optional(),
});

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;

// ──────────────────────────────────────────────────────────────
// Update Question Schema (partial of create)
// ──────────────────────────────────────────────────────────────

export const updateQuestionSchema = createQuestionSchema.partial();

export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
