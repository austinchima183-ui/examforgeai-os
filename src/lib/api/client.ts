// ============================================================================
// ExamForge AI — API Client
// ============================================================================
// Type-safe wrapper around fetch for server-side API calls.
// Handles authentication, error parsing, and response typing.
// ============================================================================

import { logger } from '@/lib/utils/logger'
import {
  AppError,
  AuthError,
  NetworkError,
  NotFoundError,
  PermissionError,
  ValidationError,
  RateLimitError,
  ConflictError,
} from './errors'
import type { Result } from './result'
import { success, failure } from './result'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  /** Request headers */
  headers?: Record<string, string>
  /** Request query parameters */
  params?: Record<string, string | number | boolean | undefined>
  /** Request body (will be JSON-serialized) */
  body?: unknown
  /** Request timeout in milliseconds */
  timeout?: number
  /** Custom fetch options */
  fetchOptions?: RequestInit
  /** Authentication token (if not using cookies) */
  token?: string
  /** Service port for gateway routing (XTransformPort) */
  servicePort?: number
}

interface ApiResponse<T> {
  data: T
  status: number
  headers: Headers
}

// ──────────────────────────────────────────────────────────────
// API Client Configuration
// ──────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 30_000
const DEFAULT_BASE_URL = ''

// ──────────────────────────────────────────────────────────────
// Error Mapping
// ──────────────────────────────────────────────────────────────

function mapStatusToError(status: number, message: string, details?: Record<string, unknown>): AppError {
  switch (status) {
    case 401:
      return new AuthError(message, details)
    case 403:
      return new PermissionError(message, details)
    case 404:
      return new NotFoundError(message, undefined, details)
    case 409:
      return new ConflictError(message, details)
    case 422:
      return new ValidationError(message, undefined, details)
    case 429:
      return new RateLimitError(message, undefined, details)
    default:
      return new AppError(message, status, 'API_ERROR', details)
  }
}

// ──────────────────────────────────────────────────────────────
// URL Builder
// ──────────────────────────────────────────────────────────────

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>, servicePort?: number): string {
  const url = new URL(path, window?.location?.origin || 'http://localhost:3000')

  // Append query parameters
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    })
  }

  // Append service port for gateway routing
  if (servicePort) {
    url.searchParams.set('XTransformPort', String(servicePort))
  }

  return url.toString()
}

// ──────────────────────────────────────────────────────────────
// API Client Class
// ──────────────────────────────────────────────────────────────

class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>
  private defaultTimeout: number

  constructor(options?: {
    baseUrl?: string
    defaultHeaders?: Record<string, string>
    timeout?: number
  }) {
    this.baseUrl = options?.baseUrl ?? DEFAULT_BASE_URL
    this.defaultHeaders = options?.defaultHeaders ?? {}
    this.defaultTimeout = options?.timeout ?? DEFAULT_TIMEOUT
  }

  /**
   * Make a GET request.
   */
  async get<T>(path: string, options?: RequestOptions): Promise<Result<ApiResponse<T>>> {
    return this.request<T>('GET', path, options)
  }

  /**
   * Make a POST request.
   */
  async post<T>(path: string, options?: RequestOptions): Promise<Result<ApiResponse<T>>> {
    return this.request<T>('POST', path, options)
  }

  /**
   * Make a PUT request.
   */
  async put<T>(path: string, options?: RequestOptions): Promise<Result<ApiResponse<T>>> {
    return this.request<T>('PUT', path, options)
  }

  /**
   * Make a PATCH request.
   */
  async patch<T>(path: string, options?: RequestOptions): Promise<Result<ApiResponse<T>>> {
    return this.request<T>('PATCH', path, options)
  }

  /**
   * Make a DELETE request.
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<Result<ApiResponse<T>>> {
    return this.request<T>('DELETE', path, options)
  }

  /**
   * Core request method with error handling and timeout.
   */
  private async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {}
  ): Promise<Result<ApiResponse<T>>> {
    const url = buildUrl(path, options.params, options.servicePort)
    const timeout = options.timeout ?? this.defaultTimeout

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...options.headers,
    }

    // Add authorization header if token provided
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
      ...options.fetchOptions,
    }

    // Add body for non-GET requests
    if (options.body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(options.body)
    }

    // Create abort controller for timeout
    const controller = new AbortController()
    fetchOptions.signal = controller.signal

    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      logger.debug(`API ${method} ${path}`, { method, path })

      const response = await fetch(url, fetchOptions)

      // Parse response
      let data: unknown
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      // Handle error responses
      if (!response.ok) {
        const errorMessage = typeof data === 'object' && data !== null && 'message' in data
          ? String((data as { message: string }).message)
          : `Request failed with status ${response.status}`

        const errorDetails = typeof data === 'object' && data !== null && 'details' in data
          ? (data as { details: Record<string, unknown> }).details
          : undefined

        const error = mapStatusToError(response.status, errorMessage, errorDetails)
        logger.warn(`API ${method} ${path} failed`, { status: response.status, error: errorMessage })

        return failure(error)
      }

      logger.debug(`API ${method} ${path} succeeded`, { status: response.status })

      return success({
        data: data as T,
        status: response.status,
        headers: response.headers,
      })
    } catch (error) {
      if (error instanceof AppError) {
        return failure(error)
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = new NetworkError(`Request timed out after ${timeout}ms`)
        logger.error(`API ${method} ${path} timed out`, { timeout })
        return failure(timeoutError)
      }

      const networkError = new NetworkError(
        error instanceof Error ? error.message : 'Unknown network error'
      )
      logger.error(`API ${method} ${path} network error`, {
        error: error instanceof Error ? error.message : 'Unknown',
      })
      return failure(networkError)
    } finally {
      clearTimeout(timeoutId)
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Singleton Export
// ──────────────────────────────────────────────────────────────

export const apiClient = new ApiClient()

export { ApiClient }
export type { RequestOptions, ApiResponse, HttpMethod }
