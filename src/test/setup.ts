// ============================================================================
// ExamForge AI — Global Test Setup
// ============================================================================
// Vitest setupFiles entry: jsdom polyfills, RTL lifecycle, matchers, and
// test-only environment defaults (no real third-party API calls — fetch is
// mocked per-test).
// ============================================================================

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Test-only environment defaults (must exist BEFORE any module import reads
// process.env at module scope). Placeholder third-party keys are fine —
// every network call in unit tests is mocked.
// ---------------------------------------------------------------------------
// NODE_ENV is read-only in @types/node — use a typed record assignment
;(process.env as Record<string, string | undefined>).NODE_ENV =
  process.env.NODE_ENV ?? 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
process.env.SESSION_TOKEN_SECRET = process.env.SESSION_TOKEN_SECRET || 'test-session-secret-0123456789abcdef'
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-csrf-secret-0123456789abcdef'
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'test-encryption-key-0123456789abcdef'
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-nextauth-secret-0123456789abcdef'
process.env.FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK_TEST-MOCK-PUBLIC-KEY'
process.env.FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || 'FLWSECK_TEST-MOCK-SECRET-KEY'
process.env.FLUTTERWAVE_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET || 'test-webhook-secret'
process.env.FLUTTERWAVE_WEBHOOK_HASH = process.env.FLUTTERWAVE_WEBHOOK_HASH || 'test-webhook-hash'
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-mock-openai-key'
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-mock-key'
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_testmockresendkey'

// ---------------------------------------------------------------------------
// Browser API polyfills / stubs for jsdom
// ---------------------------------------------------------------------------
beforeAll(() => {
  // matchMedia — used by use-mobile hook and responsive components
  if (typeof window !== 'undefined' && !window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // legacy API
        removeListener: vi.fn(), // legacy API
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  }

  // ResizeObserver — used by charts, auto-size containers, dashboard grid
  if (typeof globalThis.ResizeObserver === 'undefined') {
    class ResizeObserverStub {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    }
    globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver
  }

  // IntersectionObserver — used by lazy-mounted widgets and infinite scroll
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    class IntersectionObserverStub {
      root = null
      rootMargin = ''
      thresholds = []
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
      takeRecords = vi.fn(() => [])
    }
    globalThis.IntersectionObserver =
      IntersectionObserverStub as unknown as typeof IntersectionObserver
  }

  // scrollIntoView — jsdom does not implement layout
  if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn()
  }

  // crypto.randomUUID — jsdom's crypto lacks it on some versions
  if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
    Object.defineProperty(crypto, 'randomUUID', {
      value: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }),
    })
  }

  // Pointer capture APIs — used by drag interactions
  if (typeof Element !== 'undefined' && !Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  }
})

// ---------------------------------------------------------------------------
// RTL lifecycle
// ---------------------------------------------------------------------------
afterEach(() => {
  cleanup()
})
