// Probe: find the aria-hidden focusable elements on mobile dashboard
import { chromium, devices } from '@playwright/test'

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({ ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } })
  const page = await context.newPage()

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder="you@school.edu"]').first().fill('prod-final-1787626351@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/login')) break
  }
  await page.waitForTimeout(4000)

  const info = await page.evaluate(() => {
    const out: string[] = []
    for (const cls of ['z-\\[9999\\]', 'z-\\[9998\\]']) {
      document.querySelectorAll(`.${cls}`).forEach((el) => {
        out.push(
          `.${cls} tag=${el.tagName} aria-hidden=${el.getAttribute('aria-hidden')} id=${el.id} focusableChildren=${el.querySelectorAll('a,button,input,select,textarea,[tabindex]').length} html=${el.outerHTML.slice(0, 120)}`
        )
      })
    }
    return out
  })
  info.forEach((i) => console.log(i))

  // h1 presence
  const h1 = await page.evaluate(() => document.querySelectorAll('h1').length)
  console.log('h1 count:', h1)

  await browser.close()
}

main().catch((e) => {
  console.error('probe failed:', e)
  process.exit(1)
})
