// Probe: login as student against PRODUCTION, inspect main content state
import { chromium } from '@playwright/test'

const BASE = process.env.VERIFY_BASE || 'https://web-alpha-bay-87.vercel.app'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()

  const consoleMsgs: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      consoleMsgs.push(`[${m.type()}] ${m.text().slice(0, 200)}`)
    }
  })
  page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message.slice(0, 300)}`))

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)

  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30_000 })
  await emailInput.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')

  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 })
  console.log('URL after login:', page.url())

  // Wait generously for content
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000)
    const len = await page.evaluate(() => {
      const m = document.querySelector('main')
      return m ? (m as HTMLElement).innerText.length : -1
    })
    console.log(`t=${(i + 1)}s main.innerText length = ${len}`)
    if (len > 200) break
  }

  const info = await page.evaluate(() => {
    const m = document.querySelector('main')
    if (!m) return { exists: false }
    const cs = getComputedStyle(m)
    const first = m.firstElementChild
    return {
      exists: true,
      display: cs.display,
      visibility: cs.visibility,
      childCount: m.children.length,
      innerHTMLLen: m.innerHTML.length,
      firstChildTag: first?.tagName,
      firstChildStyle: first?.getAttribute('style'),
      textPreview: (m as HTMLElement).innerText.slice(0, 150),
      // check the motion wrapper
      motionEl: m.querySelector('[style*="opacity"]')?.getAttribute('style'),
    }
  })
  console.log('MAIN INFO:', JSON.stringify(info, null, 1))
  console.log('CONSOLE:', consoleMsgs.slice(0, 10))

  await browser.close()
}

main().catch((e) => {
  console.error('PROBE FAILED:', e.message)
  process.exit(1)
})
