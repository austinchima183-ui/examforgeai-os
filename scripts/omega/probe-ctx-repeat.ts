// Probe: repeat right-clicks to find flakiness pattern
import { chromium, devices } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'Africa/Lagos',
  })
  const page = await context.newPage()

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder="you@school.edu"]').fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/login')) break
  }
  await page.waitForTimeout(2000)

  const grid = page.locator('[role="list"][aria-label*="widgets"]').first()
  await grid.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(1500)

  const widget = grid.locator('[role="listitem"]').first()

  for (let attempt = 1; attempt <= 4; attempt++) {
    await widget.click({ button: 'right' })
    await page.waitForTimeout(600)
    const menuCount = await page.getByRole('menu').count()
    console.log(`attempt ${attempt}: menus open = ${menuCount}`)
    if (menuCount > 0) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }
  }

  await browser.close()
}

main().catch((e) => {
  console.error('probe failed:', e)
  process.exit(1)
})
