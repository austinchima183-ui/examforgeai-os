// Test billing: fetch plans via authenticated DB query, then checkout
import { chromium } from 'playwright'

const TARGET = process.argv[2] || 'http://localhost:3000'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  await page.goto(TARGET + '/login', { waitUntil: 'domcontentloaded' })
  const email = page.locator('input[placeholder="you@school.edu"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1000)
  await email.fill('e2e-schooladmin-1787626988@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('SchoolAdmin123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 45000 })

  // Query plans through the page session (RLS-authenticated Supabase REST)
  const plans = await page.evaluate(async () => {
    const { createClient } = await import('@/lib/supabase/client' as string).catch(() => ({}))
    return null
  }).catch(() => null)

  // Use the pricing page data or subscriptions endpoint which may embed plan info
  const r1 = await page.request.get(TARGET + '/api/billing/subscriptions')
  const subBody = await r1.json()

  // The subscriptions endpoint exposes plans? Let me check what it returned
  // Fetch plans through direct Supabase REST with session cookies is complex;
  // instead try the marketplace-style public plan list
  const pricingRes = await page.request.get(TARGET + '/pricing').catch(() => null)

  // Try checkout with a plan name-based discovery first — check the checkout route validation
  const csrfRes = await page.request.get(TARGET + '/api/auth/csrf')
  const { token } = await csrfRes.json()

  // invalid uuid first to learn schema
  const r2 = await page.request.post(TARGET + '/api/billing/checkout', {
    headers: { 'x-csrf-token': token, 'Content-Type': 'application/json' },
    data: { planId: '00000000-0000-0000-0000-000000000000' },
    timeout: 30000,
  })
  console.log('checkout with zero-uuid:', r2.status(), (await r2.text()).slice(0, 200))

  await browser.close()
})().catch(e => { console.error('FATAL:', String(e).slice(0, 300)); process.exit(1) })
