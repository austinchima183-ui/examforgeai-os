// ============================================================================
// ExamForge AI — Validator Barrel Exports
// ============================================================================
// Central export point for all Zod validation schemas.
// Import schemas and types from here to maintain a clean import path.
// ============================================================================

// ── Auth Validators ──────────────────────────────────────────
export {
  loginSchema,
  signupSchema,
  resetPasswordSchema,
  updatePasswordSchema,
  updateProfileSchema,
  USER_ROLES,
} from './auth';

export type {
  LoginInput,
  SignupInput,
  ResetPasswordInput,
  UpdatePasswordInput,
  UpdateProfileInput,
} from './auth';

// ── Question Validators ──────────────────────────────────────
export {
  questionOptionSchema,
  questionTypeEnum,
  difficultyLevelEnum,
  createQuestionSchema,
  updateQuestionSchema,
} from './question';

export type {
  QuestionOptionInput,
  CreateQuestionInput,
  UpdateQuestionInput,
} from './question';

// ── Exam Validators ──────────────────────────────────────────
export {
  examSettingsSchema,
  examQuestionRefSchema,
  createExamSchema,
  answerSchema,
} from './exam';

export type {
  ExamSettingsInput,
  ExamQuestionRefInput,
  CreateExamInput,
  AnswerInput,
} from './exam';

// ── Contact Validator ───────────────────────────────────────
export {
  contactSchema,
  derivePriority,
} from './contact';

export type {
  ContactFormData,
} from './contact';

// ── Newsletter Validator ────────────────────────────────────
export {
  newsletterSchema,
} from './newsletter';

export type {
  NewsletterFormData,
} from './newsletter';

// ── Demo Booking Validator ─────────────────────────────────
export {
  demoBookingSchema,
} from './demo-booking';

export type {
  DemoBookingFormData,
} from './demo-booking';

// ── API Schemas ─────────────────────────────────────────────
export * from './api-schemas';
