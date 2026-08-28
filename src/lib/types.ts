// ============================================================================
// ExamForge AI — Shared Type Definitions
// ============================================================================
// Central type definitions used across the application.
// UserRole is imported from here by stores, validators, and components.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// User Roles
// ──────────────────────────────────────────────────────────────

import type { UserRole as UserRoleType } from './canonical-types';
export type UserRole = UserRoleType;

// Re-export ExamStatus from canonical-types for backward compatibility
export type { ExamStatus } from './canonical-types';

// Re-export QuestionType from canonical-types (single source of truth)
export type { QuestionType } from './canonical-types';

// ──────────────────────────────────────────────────────────────
// User
// ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  schoolId?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ──────────────────────────────────────────────────────────────
// Question Types
// ──────────────────────────────────────────────────────────────

// QuestionTypes — re-exported from canonical-types (see above)
// The canonical version is the single source of truth:
// single_choice, multi_choice, true_false, short_answer, essay,
// fill_blank, multi_select, matching, ordering

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface QuestionOption {
  id: string;
  label: string;
  content: string;
  isCorrect?: boolean;
}

// Exam Types (ExamStatus is re-exported from canonical-types above)


export interface ExamSettings {
  shuffleQuestions: boolean;
  showResults: boolean;
  allowReview: boolean;
  autoSubmit: boolean;
}

// ──────────────────────────────────────────────────────────────
// UI / Toast Types
// ──────────────────────────────────────────────────────────────

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  createdAt: number;
}

// ──────────────────────────────────────────────────────────────
// Notification Types
// ──────────────────────────────────────────────────────────────

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied';

// ──────────────────────────────────────────────────────────────
// Sync Status for CBT Offline Support
// ──────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

// ──────────────────────────────────────────────────────────────
// Active Module Type
// ──────────────────────────────────────────────────────────────

export type ActiveModule =
  | 'dashboard'
  | 'exams'
  | 'questions'
  | 'students'
  | 'teachers'
  | 'analytics'
  | 'settings'
  | 'profile'
  | 'billing'
  | 'marketplace'
  | 'ai-tutor'
  | 'study-planner'
  | 'resources';
