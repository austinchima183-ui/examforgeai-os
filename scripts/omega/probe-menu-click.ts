// Probe: click context menu item after menu stabilizes
import { chromium, devices } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
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
  await page.waitForTimeout(3000)

  const grid = page.locator('[role="list"][aria-label*="widgets"]').first()
  await grid.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(2500) // let KPI count-up + AI insights settle

  const widget = grid.locator('[role="listitem"]').first()
  await widget.click({ button: 'right' })
  await page.waitForTimeout(600)

  const menuCount = await page.getByRole('menu').count()
  console.log('menu open after 600ms:', menuCount)

  if (menuCount > 0) {
    const fsItem = page.getByRole('menu').getByRole('menuitem', { name: 'Fullscreen' })
    const stable = await fsItem.isVisible()
    console.log('Fullscreen item visible:', stable)
    try {
      await fsItem.click({ timeout: 8000 })
      console.log('clicked Fullscreen item')
    } catch (e) {
      console.log('click FAILED:', String(e).slice(0, 200))
    }
    await page.waitForTimeout(1000)
    const dialogs = await page.getByRole('dialog').count()
    console.log('dialogs after click:', dialogs)
    await page.screenshot({ path: '/tmp/probe-fs.png' })
  }

  await browser.close()
}

main().catch((e) => {
  console.error('probe failed:', e)
  process.exit(1)
})
