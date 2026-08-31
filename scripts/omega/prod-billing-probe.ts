// Ω-12: Probe production billing/plans flow with an authenticated session.
// Verifies: login → GET /api/billing/plans → POST /api/admin/seed-plans → plans listing
import { chromium } from 'playwright'
import fs from 'fs'

const TARGET = process.argv[2] || 'https://web-alpha-bay-87.vercel.app'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  console.log(`Target: ${TARGET}`)

  // 1. Login as super admin
  await page.goto(TARGET + '/login', { waitUntil: 'domcontentloaded' })
  const email = page.locator('input[placeholder="you@school.edu"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await email.fill('e2e-superadmin@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('SuperAdmin123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u: any) => !u.pathname.startsWith('/login'), { timeout: 45000 })
  console.log('✓ logged in as super admin')

  // 2. GET billing plans (authenticated)
  const plansResult = await page.evaluate(async () => {
    const r = await fetch('/api/billing/plans', { credentials: 'include' })
    const body = await r.text()
    return { status: r.status, body: body.slice(0, 400) }
  })
  console.log('GET /api/billing/plans →', plansResult.status, plansResult.body.slice(0, 300))

  // 3. Get CSRF token, then POST seed-plans (super_admin route)
  const csrfResult = await page.evaluate(async () => {
    const r = await fetch('/api/auth/csrf', { credentials: 'include' })
    return r.json()
  })
  const csrfToken = csrfResult?.token || csrfResult?.csrfToken || ''
  console.log('CSRF token acquired:', csrfToken ? 'yes' : 'NO — ' + JSON.stringify(csrfResult).slice(0, 200))

  const seedResult = await page.evaluate(async (token: string) => {
    const r = await fetch('/api/admin/seed-plans', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
      },
    })
    const body = await r.text()
    return { status: r.status, body: body.slice(0, 500) }
  }, csrfToken)
  console.log('POST /api/admin/seed-plans →', seedResult.status, seedResult.body.slice(0, 400))

  // 4. Re-query plans after seed attempt
  const plansAfter = await page.evaluate(async () => {
    const r = await fetch('/api/billing/plans', { credentials: 'include' })
    const body = await r.text()
    return { status: r.status, body: body.slice(0, 400) }
  })
  console.log('GET /api/billing/plans (after seed) →', plansAfter.status, plansAfter.body.slice(0, 300))

  fs.writeFileSync(
    '/home/z/my-project/download/verification/audit/prod-billing-probe.json',
    JSON.stringify({ target: TARGET, plansResult, seedResult, plansAfter }, null, 2)
  )

  await browser.close()
})().catch((e) => {
  console.error('PROBE FAILED:', e.message)
  process.exit(1)
})
