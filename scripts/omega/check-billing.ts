// Check teacher's school + subscription state + test billing checkout flow
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
  await email.fill('e2e-teacher-1787626988@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('Teacher123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 45000 })
  console.log('✓ teacher login')

  // Read the teacher's profile from the page's data (dashboard fetches user)
  const profile = await page.evaluate(async () => {
    const res = await fetch('/api/tenants/resolve', { method: 'GET' })
    return { status: res.status, body: await res.text() }
  })
  console.log('tenant resolve:', profile.status, profile.body.slice(0, 200))

  // Check the school-admin's billing state instead (they own the subscription)
  const ctx2 = await browser.newContext()
  const page2 = await ctx2.newPage()
  await page2.goto(TARGET + '/login', { waitUntil: 'domcontentloaded' })
  const email2 = page2.locator('input[placeholder="you@school.edu"]').first()
  await email2.waitFor({ state: 'visible', timeout: 30000 })
  await page2.waitForTimeout(1000)
  await email2.fill('e2e-schooladmin-1787626988@examforge-test.com')
  await page2.locator('input[placeholder="Enter your password"]').first().fill('SchoolAdmin123!')
  await page2.click('button[type="submit"]:has-text("Sign In")')
  await page2.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 45000 })
  console.log('✓ school_admin login')

  // subscriptions API
  for (const ep of ['/api/billing/subscriptions', '/api/billing/invoices']) {
    try {
      const r = await page2.request.get(TARGET + ep, { timeout: 20000 })
      const t = await r.text()
      console.log(`${ep} → ${r.status()} ${t.slice(0, 180)}`)
    } catch (e) { console.log(`${ep} → ERROR`) }
  }

  // billing page state
  try {
    await page2.goto(TARGET + '/billing', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page2.waitForTimeout(3000)
    const text = (await page2.locator('body').innerText()).split('\n').filter(l => l.trim()).slice(0, 20)
    console.log('billing page:', JSON.stringify(text.slice(0, 12)))
  } catch (e) { console.log('billing page error:', String(e).slice(0, 100)) }

  await browser.close()
})().catch(e => { console.error('FATAL:', String(e).slice(0, 300)); process.exit(1) })
