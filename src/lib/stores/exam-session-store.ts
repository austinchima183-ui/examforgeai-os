// ============================================================================
// ExamForge AI — CBT Exam Session Store
// ============================================================================
// Manages the state of an active Computer-Based Test (CBT) exam session.
// Supports offline mode with answer persistence, timer countdown, and sync
// status tracking. All session data is persisted to localStorage so that
// students can resume after a browser refresh or temporary disconnection.
// ============================================================================

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import type { SyncStatus } from '@/lib/types';

// ──────────────────────────────────────────────────────────────
// Exam Session State Interface
// ──────────────────────────────────────────────────────────────

interface ExamSessionState {
  activeExamId: string | null;
  answers: Record<string, string>;
  currentQuestionIndex: number;
  timerRemaining: number;
  /** Ω-UI: flags survive reloads alongside answers/timer so the palette
   *  never loses marked-for-review state mid-exam. */
  markedForReview: string[];
  isOffline: boolean;
  syncStatus: SyncStatus;
  lastSavedAt: string | null;
}

// ──────────────────────────────────────────────────────────────
// Exam Session Actions Interface
// ──────────────────────────────────────────────────────────────

interface ExamSessionActions {
  startExam: (examId: string, durationSeconds: number, totalQuestions: number) => void;
  setAnswer: (questionId: string, answer: string) => void;
  setCurrentQuestion: (index: number) => void;
  setTimerRemaining: (seconds: number) => void;
  toggleMarkedForReview: (questionId: string) => void;
  setOffline: (offline: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSaved: (timestamp: string) => void;
  clearExam: () => void;
  getAnswers: () => Record<string, string>;
}

// ──────────────────────────────────────────────────────────────
// Initial State
// ──────────────────────────────────────────────────────────────

const initialState: ExamSessionState = {
  activeExamId: null,
  answers: {},
  currentQuestionIndex: 0,
  timerRemaining: 0,
  markedForReview: [],
  isOffline: false,
  syncStatus: 'idle',
  lastSavedAt: null,
};

// ──────────────────────────────────────────────────────────────
// Exam Session Store
// ──────────────────────────────────────────────────────────────

export const useExamSessionStore = create<ExamSessionState & ExamSessionActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        startExam: (examId, durationSeconds, _totalQuestions) =>
          set(
            {
              activeExamId: examId,
              answers: {},
              currentQuestionIndex: 0,
              timerRemaining: durationSeconds,
              markedForReview: [],
              isOffline: false,
              syncStatus: 'idle',
              lastSavedAt: null,
            },
            false,
            'startExam'
          ),

        setAnswer: (questionId, answer) =>
          set(
            (state) => ({
              answers: {
                ...state.answers,
                [questionId]: answer,
              },
            }),
            false,
            'setAnswer'
          ),

        setCurrentQuestion: (index) =>
          set({ currentQuestionIndex: index }, false, 'setCurrentQuestion'),

        setTimerRemaining: (seconds) =>
          set({ timerRemaining: seconds }, false, 'setTimerRemaining'),

        toggleMarkedForReview: (questionId) =>
          set(
            (state) => ({
              markedForReview: state.markedForReview.includes(questionId)
                ? state.markedForReview.filter((id) => id !== questionId)
                : [...state.markedForReview, questionId],
            }),
            false,
            'toggleMarkedForReview'
          ),

        setOffline: (offline) =>
          set(
            {
              isOffline: offline,
              syncStatus: offline ? 'offline' : 'idle',
            },
            false,
            'setOffline'
          ),

        setSyncStatus: (status) =>
          set({ syncStatus: status }, false, 'setSyncStatus'),

        setLastSaved: (timestamp) =>
          set(
            {
              lastSavedAt: timestamp,
              syncStatus: 'synced',
            },
            false,
            'setLastSaved'
          ),

        clearExam: () =>
          set(initialState, false, 'clearExam'),

        getAnswers: () => get().answers,
      }),
      {
        name: 'examforge-exam-session',
        storage: createJSONStorage(() => localStorage),
        // Persist the entire session state so students can resume
        // after a page refresh or accidental tab closure.
        partialize: (state) => ({
          activeExamId: state.activeExamId,
          answers: state.answers,
          currentQuestionIndex: state.currentQuestionIndex,
          timerRemaining: state.timerRemaining,
          markedForReview: state.markedForReview,
          isOffline: state.isOffline,
          syncStatus: state.syncStatus,
          lastSavedAt: state.lastSavedAt,
        }),
      }
    ),
    {
      name: 'ExamSessionStore',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);
