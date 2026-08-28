// ============================================================================
// ExamForge AI — Exam Zod Schemas
// ============================================================================
// Validation schemas for exam creation, answer submission, and exam settings.
// ============================================================================

import { z } from 'zod';

// ──────────────────────────────────────────────────────────────
// Exam Settings Schema
// ──────────────────────────────────────────────────────────────

export const examSettingsSchema = z.object({
  shuffleQuestions: z.boolean().default(false),
  showResults: z.boolean().default(true),
  allowReview: z.boolean().default(true),
  autoSubmit: z.boolean().default(true),
});

export type ExamSettingsInput = z.infer<typeof examSettingsSchema>;

// ──────────────────────────────────────────────────────────────
// Exam Question Reference Schema
// ──────────────────────────────────────────────────────────────

export const examQuestionRefSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  order: z.number().int().min(0).optional(),
  marks: z.number().int().min(1, 'Marks must be at least 1').optional(),
});

export type ExamQuestionRefInput = z.infer<typeof examQuestionRefSchema>;

// ──────────────────────────────────────────────────────────────
// Create Exam Schema
// ──────────────────────────────────────────────────────────────

export const createExamSchema = z
  .object({
    title: z
      .string()
      .min(1, 'Exam title is required')
      .max(300, 'Exam title must be at most 300 characters'),
    subject: z
      .string()
      .min(1, 'Subject is required')
      .max(200, 'Subject must be at most 200 characters'),
    duration: z
      .number()
      .int('Duration must be a whole number')
      .min(1, 'Duration must be at least 1 minute')
      .max(600, 'Duration must be at most 600 minutes'),
    totalMarks: z
      .number()
      .int('Total marks must be a whole number')
      .min(1, 'Total marks must be at least 1')
      .max(10000, 'Total marks must be at most 10,000'),
    passingMarks: z
      .number()
      .int('Passing marks must be a whole number')
      .min(0, 'Passing marks must be at least 0'),
    questions: z
      .array(examQuestionRefSchema)
      .min(1, 'An exam must have at least one question'),
    settings: examSettingsSchema,
  })
  .refine((data) => data.passingMarks <= data.totalMarks, {
    message: 'Passing marks cannot exceed total marks',
    path: ['passingMarks'],
  });

export type CreateExamInput = z.infer<typeof createExamSchema>;

// ──────────────────────────────────────────────────────────────
// Answer Schema
// ──────────────────────────────────────────────────────────────

export const answerSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  questionId: z.string().min(1, 'Question ID is required'),
  answer: z.string().min(1, 'Answer is required'),
});

export type AnswerInput = z.infer<typeof answerSchema>;
