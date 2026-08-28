// ============================================================================
// ExamForge AI — API Barrel Export
// ============================================================================
// Re-exports all API modules for convenient importing.
// ============================================================================

export { success, failure, isSuccess, isFailure, mapResult, mapError, unwrap, unwrapOr } from './result'
export type { Result, SuccessResult, FailureResult } from './result'

export {
  AppError,
  AuthError,
  EmailNotVerifiedError,
  PermissionError,
  NotFoundError,
  ValidationError,
  NetworkError,
  RateLimitError,
  ConflictError,
} from './errors'

export { apiClient, ApiClient } from './client'
export type { RequestOptions, ApiResponse, HttpMethod } from './client'
