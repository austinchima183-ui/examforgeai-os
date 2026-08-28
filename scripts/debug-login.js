// Debug login failure — captures network + console
const { chromium } = require('@playwright/test')

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()

  page.on('console', (msg) => console.log('[console]', msg.type(), msg.text().slice(0, 300)))
  page.on('request', (req) => {
    if (req.url().includes('localhost') && !req.url().includes('_next')) {
      console.log('[req]', req.method(), req.url().slice(0, 100))
    }
  })
  page.on('response', (res) => {
    if (res.url().includes('localhost') && !res.url().includes('_next')) {
      console.log('[res]', res.status(), res.url().slice(0, 100))
    }
  })

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.fill('input[placeholder="you@school.edu"]', 'prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForTimeout(8000)
  console.log('Final URL:', page.url())
  await browser.close()
})()
