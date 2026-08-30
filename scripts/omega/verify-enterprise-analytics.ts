// Verify the enterprise analytics page renders LIVE data (Ω-8)
import { chromium, devices } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({ ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  // Track the analytics API call
  const apiCalls: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/api/analytics/enterprise')) apiCalls.push(r.url())
  })

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder="you@school.edu"]').first().fill('e2e-superadmin@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('SuperAdmin123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/login')) break
  }
  console.log('logged in, URL:', page.url())

  await page.goto('http://localhost:3000/analytics/enterprise', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)

  console.log('analytics API calls:', apiCalls.length)
  apiCalls.slice(0, 3).forEach((u) => console.log('  ', u.replace('http://localhost:3000', '')))

  // Check KPI cards render with live-data badge
  const liveBadges = await page.getByText('live data').count()
  console.log('live-data KPI badges:', liveBadges)

  // Ensure NO fake hardcoded values remain
  const body = await page.locator('body').innerText()
  const fakes = ['$585,000', '$48,750', '94.2%', '850K', '42,500', '124K', '45.2M', '$2,340']
  const foundFakes = fakes.filter((f) => body.includes(f))
  console.log('fake values found:', foundFakes.length === 0 ? 'NONE ✓' : foundFakes)

  await page.screenshot({ path: 'download/verification/omega-local/screenshots/omega8-enterprise-analytics-live.png' })
  await browser.close()
}

main().catch((e) => {
  console.error('failed:', e)
  process.exit(1)
})
