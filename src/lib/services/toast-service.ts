// ============================================================================
// ExamForge AI — Toast Service
// ============================================================================
// Wrapper around sonner toast library with predefined variants for
// consistent notification styling across the application.
// ============================================================================

import { toast as sonnerToast } from 'sonner'

// ──────────────────────────────────────────────────────────────
// Toast Options
// ──────────────────────────────────────────────────────────────

interface ToastOptions {
  /** Optional description text below the title */
  description?: string
  /** Duration in milliseconds (default: 4000) */
  duration?: number
  /** Whether the toast can be dismissed */
  dismissible?: boolean
  /** Action button label */
  action?: {
    label: string
    onClick: () => void
  }
  /** Cancel button label */
  cancel?: {
    label: string
    onClick?: () => void
  }
}

// ──────────────────────────────────────────────────────────────
// Predefined Toast Variants
// ──────────────────────────────────────────────────────────────

/**
 * Show a success toast notification.
 *
 * @param title - The toast title
 * @param options - Additional toast options
 *
 * @example
 * ```ts
 * toastService.success('Exam created successfully')
 * toastService.success('Saved', { description: 'Your changes have been saved.' })
 * ```
 */
function success(title: string, options?: ToastOptions): void {
  sonnerToast.success(title, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    dismissible: options?.dismissible ?? true,
    action: options?.action
      ? { label: options.action.label, onClick: options.action.onClick as (e: React.MouseEvent<HTMLButtonElement>) => void }
      : undefined,
    cancel: options?.cancel
      ? { label: options.cancel.label, onClick: options.cancel.onClick as (e: React.MouseEvent<HTMLButtonElement>) => void }
      : undefined,
  })
}

/**
 * Show an error toast notification.
 *
 * @param title - The toast title
 * @param options - Additional toast options
 *
 * @example
 * ```ts
 * toastService.error('Failed to save exam')
 * toastService.error('Error', { description: 'Please try again later.' })
 * ```
 */
function error(title: string, options?: ToastOptions): void {
  sonnerToast.error(title, {
    description: options?.description,
    duration: options?.duration ?? 6000,
    dismissible: options?.dismissible ?? true,
    action: options?.action
      ? { label: options.action.label, onClick: options.action.onClick as (e: React.MouseEvent<HTMLButtonElement>) => void }
      : undefined,
    cancel: options?.cancel
      ? { label: options.cancel.label, onClick: options.cancel.onClick as (e: React.MouseEvent<HTMLButtonElement>) => void }
      : undefined,
  })
}

/**
 * Show a warning toast notification.
 *
 * @param title - The toast title
 * @param options - Additional toast options
 *
 * @example
 * ```ts
 * toastService.warning('Exam will start in 5 minutes')
 * ```
 */
function warning(title: string, options?: ToastOptions): void {
  sonnerToast.warning(title, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    dismissible: options?.dismissible ?? true,
    action: options?.action
      ? { label: options.action.label, onClick: options.action.onClick as (e: React.MouseEvent<HTMLButtonElement>) => void }
      : undefined,
    cancel: options?.cancel
      ? { label: options.cancel.label, onClick: options.cancel.onClick as (e: React.MouseEvent<HTMLButtonElement>) => void }
      : undefined,
  })
}

/**
 * Show an info toast notification.
 *
 * @param title - The toast title
 * @param options - Additional toast options
 *
 * @example
 * ```ts
 * toastService.info('New exam available')
 * ```
 */
function info(title: string, options?: ToastOptions): void {
  sonnerToast.info(title, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    dismissible: options?.dismissible ?? true,
    action: options?.action
      ? { label: options.action.label, onClick: options.action.onClick as (e: React.MouseEvent<HTMLButtonElement>) => void }
      : undefined,
    cancel: options?.cancel
      ? { label: options.cancel.label, onClick: options.cancel.onClick as (e: React.MouseEvent<HTMLButtonElement>) => void }
      : undefined,
  })
}

/**
 * Show a default toast notification (no icon).
 *
 * @param title - The toast title
 * @param options - Additional toast options
 */
function message(title: string, options?: ToastOptions): void {
  sonnerToast(title, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    dismissible: options?.dismissible ?? true,
    action: options?.action
      ? { label: options.action.label, onClick: options.action.onClick as (e: React.MouseEvent<HTMLButtonElement>) => void }
      : undefined,
    cancel: options?.cancel
      ? { label: options.cancel.label, onClick: options.cancel.onClick as (e: React.MouseEvent<HTMLButtonElement>) => void }
      : undefined,
  })
}

/**
 * Show a promise-based toast notification.
 *
 * @param promise - The promise to track
 * @param options - Messages for loading, success, and error states
 *
 * @example
 * ```ts
 * toastService.promise(saveExam(), {
 *   loading: 'Saving exam...',
 *   success: 'Exam saved successfully!',
 *   error: 'Failed to save exam.',
 * })
 * ```
 */
function promise<T>(
  promise: Promise<T>,
  options: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: Error) => string)
  }
): void {
  sonnerToast.promise(promise, {
    loading: options.loading,
    success: options.success,
    error: options.error,
  })
}

/**
 * Dismiss a specific toast or all toasts.
 *
 * @param id - Optional toast ID to dismiss. If omitted, dismisses all.
 */
function dismiss(id?: string | number): void {
  sonnerToast.dismiss(id)
}

// ──────────────────────────────────────────────────────────────
// Export
// ──────────────────────────────────────────────────────────────

export const toastService = {
  success,
  error,
  warning,
  info,
  message,
  promise,
  dismiss,
} as const

export type { ToastOptions }
