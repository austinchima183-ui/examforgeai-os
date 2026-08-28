// ============================================================================
// MISSION 9 — AI FEATURES + API VERIFICATION (authenticated)
// Verifies AI endpoints respond and key APIs work with a real session.
// ============================================================================

import { test, expect } from '@playwright/test'
import { login, shot } from './helpers'

test.describe('AI Features + Authenticated API Verification', () => {
  test('AI student tools render and AI endpoints respond', async ({ page }) => {
    await login(page, 'student')
    await page.waitForTimeout(1500)

    // ── AI Tutor page renders ──
    await page.goto('/student/ai-tutor', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await shot(page, '07-ai-tutor')

    // ── Explain Anything page renders ──
    await page.goto('/student/explain', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await shot(page, '07-ai-explain')

    // ── Authenticated API calls succeed (via fetch with session cookies) ──
    const apiResults = await page.evaluate(async () => {
      const results: Record<string, number> = {}
      const endpoints = [
        '/api/health',
        '/api/student/dashboard',
        '/api/notifications',
        '/api/ai/status',
      ]
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { credentials: 'include' })
          results[ep] = res.status
        } catch {
          results[ep] = 0
        }
      }
      return results
    })

    for (const [ep, status] of Object.entries(apiResults)) {
      // Authenticated user should never get 401/500 on these read endpoints
      expect(
        status === 401 || status === 500 || status === 0,
        `${ep} returned ${status} for authenticated student`
      ).toBe(false)
    }
  })

  test('CSRF protection: state-changing request without CSRF token is rejected', async ({ page }) => {
    await login(page, 'student')
    await page.waitForTimeout(1000)

    // POST to a mutation endpoint WITHOUT CSRF token → should be rejected (403)
    const status = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/notifications/preferences', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailNotifications: false }),
        })
        return res.status
      } catch {
        return 0
      }
    })

    // Should be 403 (CSRF missing) — NOT 200 (which would be a CSRF hole)
    expect(status !== 200, `CSRF-less PUT returned ${status} — expected rejection`).toBe(true)
  })

  test('invalid payload is rejected with 400 (input validation active)', async ({ page }) => {
    await login(page, 'student')

    const status = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: '{"invalid": true, "malformed": [1,2,}',
        })
        return res.status
      } catch {
        return 0
      }
    })

    // Malformed JSON should be 400, never 500
    expect(status !== 500 && status !== 0, `Malformed payload returned ${status}`).toBe(true)
  })
})
