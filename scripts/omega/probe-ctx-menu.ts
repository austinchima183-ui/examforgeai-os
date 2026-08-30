// Probe: right-click context menu behavior over time
import { chromium } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder="you@school.edu"]').fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/login')) break
  }
  console.log('URL:', page.url())
  await page.waitForTimeout(3000)

  const grid = page.locator('[role="list"][aria-label*="widgets"]').first()
  await grid.waitFor({ state: 'visible', timeout: 30000 })
  const widget = grid.locator('[role="listitem"]').first()
  console.log('first widget:', await widget.getAttribute('aria-label'))

  await widget.click({ button: 'right' })
  await page.waitForTimeout(1000)

  // Check menu state over time
  for (let t = 0; t <= 4000; t += 1000) {
    const menuCount = await page.getByRole('menu').count()
    const items = await page.getByRole('menu').getByRole('menuitem').allInnerTexts().catch(() => [])
    console.log(`t=${t}ms menus=${menuCount} items=${JSON.stringify(items.slice(0, 6))}`)
    if (t < 4000) await page.waitForTimeout(1000)
  }

  await page.screenshot({ path: '/tmp/ctx-menu-probe.png' })
  await browser.close()
}

main().catch((e) => {
  console.error('probe failed:', e)
  process.exit(1)
})
