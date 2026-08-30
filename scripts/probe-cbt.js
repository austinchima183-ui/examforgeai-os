const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 130)) })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 130)))

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]').first()
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await emailInput.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })
  await page.waitForTimeout(2000)

  const resp = await page.goto('http://localhost:3000/exams/ba8630ba-37f6-427b-a929-3043d10ae5b2', { waitUntil: 'domcontentloaded' })
  const statusCode = resp ? resp.status() : 0
  await page.waitForTimeout(3500)
  const info = await page.evaluate(() => {
    const main = document.querySelector('main')
    return {
      mainText: main ? main.innerText.slice(0, 150) : 'NO MAIN',
      bodyText: document.body.innerText.slice(0, 200),
      url: location.pathname,
    }
  })
  console.log(JSON.stringify(info, null, 2))
  console.log('CONSOLE:', JSON.stringify(errors.slice(0, 5)))
  await page.screenshot({ path: 'download/verification/ux2/screenshots/debug-cbt-exam-detail.png' })
  await browser.close()
})()
