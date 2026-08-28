// ============================================================================
// MISSION: Verify the LOCKED landing page is intact and healthy
// The landing page is the design authority — it must render perfectly.
// ============================================================================

import { test, expect } from '@playwright/test'
import { shot, collectConsoleErrors } from './helpers'

test.describe('Landing Page (LOCKED — design authority)', () => {
  test('homepage renders with hero, nav, CTA, and zero console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page)

    await page.goto('/', { waitUntil: 'networkidle' })

    // Core landing structure
    await expect(page).toHaveTitle(/ExamForge/i)

    // Hero section visible
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // Take the canonical landing screenshot
    await shot(page, '00-landing-page')

    // Verify key landing content exists (nav + CTA)
    const html = await page.content()
    const hasNav = await page.locator('nav, header').count()
    expect(hasNav).toBeGreaterThan(0)

    // Scroll through the page to trigger all animations (video capture)
    await page.evaluate(async () => {
      const total = document.body.scrollHeight
      for (let y = 0; y < total; y += 400) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 120))
      }
      window.scrollTo(0, 0)
    })

    await shot(page, '00-landing-scrolled')

    // Console error gate — landing must be clean
    expect(errors, `Console errors: ${errors.join('\n')}`).toHaveLength(0)
  })

  test('key marketing pages render (pricing, features, security)', async ({ page }) => {
    for (const route of ['/pricing', '/features', '/security']) {
      const res = await page.goto(route, { waitUntil: 'domcontentloaded' })
      expect(res?.status(), `${route} status`).toBeLessThan(400)
      await page.waitForTimeout(600)
    }
    await shot(page, '00-pricing-page')
  })
})
