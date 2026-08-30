// Probe: fetch the analytics API from inside an authenticated session
import { chromium, devices } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({ ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder="you@school.edu"]').first().fill('e2e-schooladmin-1787626988@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('SchoolAdmin123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/login')) break
  }

  const result = await page.evaluate(async () => {
    const res = await fetch('/api/analytics/enterprise?type=financial&period=month')
    const text = await res.text()
    return { status: res.status, body: text.slice(0, 400) }
  })
  console.log('API from session:', JSON.stringify(result, null, 1))

  await browser.close()
}

main().catch((e) => {
  console.error('failed:', e)
  process.exit(1)
})
