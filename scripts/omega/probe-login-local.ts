// Quick probe: does student login land on the dashboard?
import { chromium } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 300)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300))
  })

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const email = page.locator('input[placeholder="you@school.edu"]')
  console.log('email input visible:', await email.isVisible())
  await email.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')

  // Wait up to 30s for any navigation away from /login
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/login')) break
  }
  console.log('final URL:', page.url())
  console.log('title:', await page.title())
  const bodyText = (await page.locator('body').innerText().catch(() => '')).slice(0, 600)
  console.log('--- body preview ---')
  console.log(bodyText)
  console.log('--- errors (first 8) ---')
  errors.slice(0, 8).forEach((e) => console.log(e))
  await page.screenshot({ path: '/tmp/login-probe.png' })
  await browser.close()
}

main().catch((e) => {
  console.error('probe failed:', e)
  process.exit(1)
})
