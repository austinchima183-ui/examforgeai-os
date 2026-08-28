// ============================================================================
// ExamForge AI — Notification Store
// ============================================================================
// Manages notification state: unread count, in-app toasts, and browser
// notification permission status. Does NOT persist to localStorage —
// notification counts are fetched from the server on page load.
// ============================================================================

import { create } from 'zustand';
import type { NotificationPermissionStatus, ToastVariant } from '@/lib/types';

// ──────────────────────────────────────────────────────────────
// Notification Toast Interface
// ──────────────────────────────────────────────────────────────

interface NotificationToast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  createdAt: number;
}

// ──────────────────────────────────────────────────────────────
// Notification State Interface
// ──────────────────────────────────────────────────────────────

interface NotificationState {
  unreadCount: number;
  toasts: NotificationToast[];
  permissionStatus: NotificationPermissionStatus;
}

// ──────────────────────────────────────────────────────────────
// Notification Actions Interface
// ──────────────────────────────────────────────────────────────

interface NotificationActions {
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  setPermissionStatus: (status: NotificationPermissionStatus) => void;
  addToast: (toast: Omit<NotificationToast, 'id' | 'createdAt'>) => void;
  removeToast: (id: string) => void;
}

// ──────────────────────────────────────────────────────────────
// Initial State
// ──────────────────────────────────────────────────────────────

const initialState: NotificationState = {
  unreadCount: 0,
  toasts: [],
  permissionStatus: 'default',
};

// ──────────────────────────────────────────────────────────────
// Helper: Generate unique toast ID
// ──────────────────────────────────────────────────────────────

let notificationToastCounter = 0;
function generateNotificationToastId(): string {
  notificationToastCounter += 1;
  return `notif-toast-${Date.now()}-${notificationToastCounter}`;
}

// ──────────────────────────────────────────────────────────────
// Notification Store
// ──────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState & NotificationActions>()(
  (set) => ({
    ...initialState,

    setUnreadCount: (count) =>
      set({ unreadCount: Math.max(0, count) }),

    incrementUnread: () =>
      set((state) => ({ unreadCount: state.unreadCount + 1 })),

    decrementUnread: () =>
      set((state) => ({
        unreadCount: Math.max(0, state.unreadCount - 1),
      })),

    setPermissionStatus: (permissionStatus) =>
      set({ permissionStatus }),

    addToast: (toast) =>
      set((state) => ({
        toasts: [
          ...state.toasts,
          {
            ...toast,
            id: generateNotificationToastId(),
            createdAt: Date.now(),
          },
        ],
      })),

    removeToast: (id) =>
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      })),
  })
);
