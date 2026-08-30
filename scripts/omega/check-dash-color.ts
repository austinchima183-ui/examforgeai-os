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
  await page.waitForTimeout(4000)
  const result = await page.evaluate(() => {
    const html = document.documentElement
    const muted = getComputedStyle(html).getPropertyValue('--muted-foreground').trim()
    const samples: Array<Record<string, string>> = []
    document.querySelectorAll('main .text-muted-foreground').forEach((el, i) => {
      if (i >= 5) return
      const cs = getComputedStyle(el)
      let bg = 'transparent'
      let p = el.parentElement
      while (p) {
        const b = getComputedStyle(p).backgroundColor
        if (b && b !== 'rgba(0, 0, 0, 0)' && b !== 'transparent') { bg = b; break }
        p = p.parentElement
      }
      samples.push({ text: (el.textContent || '').trim().slice(0, 25), color: cs.color, bg, fontSize: cs.fontSize })
    })
    return { dark: html.classList.contains('dark'), muted, sampleCount: document.querySelectorAll('main .text-muted-foreground').length, samples }
  })
  console.log(JSON.stringify(result, null, 1))
  await browser.close()
}
main().catch((e) => { console.error(e.message); process.exit(1) })
