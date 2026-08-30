import { chromium } from '@playwright/test'
const BASE = 'https://web-alpha-bay-87.vercel.app'
async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30_000 })
  await emailInput.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 })
  // wait for content like local-verify does
  await page.waitForFunction(() => {
    const m = document.querySelector('main')
    return !!m && (m as HTMLElement).innerText.trim().length >= 200
  }, { timeout: 45_000 }).catch(() => {})
  await page.waitForTimeout(1500)
  const info = await page.evaluate(() => ({
    h1s: document.querySelectorAll('h1').length,
    h1Text: Array.from(document.querySelectorAll('h1')).map((h) => h.textContent?.trim().slice(0, 40)),
    headings: Array.from(document.querySelectorAll('h1,h2,h3')).slice(0, 8).map((h) => `${h.tagName}:${h.textContent?.trim().slice(0, 25)}`),
  }))
  console.log(JSON.stringify(info, null, 1))
  await browser.close()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
