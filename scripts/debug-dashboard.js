// Debug dashboard content state after login
const { chromium } = require('@playwright/test')

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[placeholder="you@school.edu"]', 'prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45_000 })
  console.log('URL after login:', page.url())

  // Wait for network idle to let all data load
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(4000)

  const info = await page.evaluate(() => {
    const main = document.querySelector('main')
    const mains = document.querySelectorAll('main').length
    const body = document.body
    return {
      mains,
      mainText: main?.innerText?.slice(0, 400) ?? 'NO MAIN',
      mainTextLen: main?.innerText?.length ?? 0,
      bodyTextLen: body.innerText.length,
      h1: document.querySelector('h1')?.textContent,
      h2s: Array.from(document.querySelectorAll('h2')).slice(0, 5).map((h) => h.textContent),
      hasSidebar: !!document.querySelector('aside'),
      asideLabel: document.querySelector('aside')?.getAttribute('aria-label'),
    }
  })
  console.log(JSON.stringify(info, null, 2))

  await browser.close()
})()
