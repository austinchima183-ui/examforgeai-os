// Debug login flow through the real UI
const { chromium } = require('playwright')

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // Capture network + console
  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) console.log(`[console.${msg.type()}]`, msg.text().slice(0, 200))
  })
  page.on('response', (res) => {
    const url = res.url()
    if (url.includes('/auth') || url.includes('/login') || url.includes('supabase')) {
      console.log(`[net] ${res.status()} ${res.request().method()} ${url.slice(0, 120)}`)
    }
  })
  page.on('requestfailed', (req) => {
    console.log(`[net-fail] ${req.method()} ${req.url().slice(0, 120)} — ${req.failure()?.errorText}`)
  })

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1500) // allow hydration to complete
  await emailInput.fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')

  // Wait and observe
  await page.waitForTimeout(12000)
  console.log('FINAL URL:', page.url())
  // Look for error messages on the page
  const errorText = await page.evaluate(() => {
    const el = document.querySelector('[role="alert"], .text-destructive, [data-testid="login-error"]')
    return el ? el.textContent : null
  })
  console.log('ERROR ELEMENT:', errorText)
  await page.screenshot({ path: '/tmp/login-debug.png' })
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
