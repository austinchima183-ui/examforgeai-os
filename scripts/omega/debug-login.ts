// Debug local login flow
import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3000'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log(`[console.${m.type()}]`, m.text().slice(0, 250))
  })
  page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 300)))
  page.on('requestfailed', (r) => console.log('[requestfailed]', r.url().slice(0, 120), r.failure()?.errorText))
  page.on('response', (r) => {
    if (r.status() >= 400) console.log('[response]', r.status(), r.url().slice(0, 140))
  })

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 20_000 })
  await emailInput.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')

  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000)
    const url = page.url()
    const errText = await page
      .locator('text=/error|invalid|incorrect|failed/i')
      .count()
      .catch(() => 0)
    console.log(`t=${(i + 1) * 2}s url=${url} errorTexts=${errText}`)
    if (!url.includes('/login')) break
  }
  await browser.close()
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
