// Verify percentage formatting fix on /results (student view)
import { chromium } from 'playwright'

const run = async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // Login as student
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[placeholder="you@school.edu"]').first().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1000)
  await page.locator('input[placeholder="you@school.edu"]').first().fill('prod-final-1787626351@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 })

  // Results page
  await page.goto('http://localhost:3000/results', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3000)

  const body = await page.locator('main').innerText()
  const pctCells = body.match(/\d+\.\d+%|\d+%/g) ?? []
  console.log('PERCENTAGE RENDERS:', JSON.stringify(pctCells.slice(0, 20)))
  console.log('RAW-LEAK PRESENT:', /66\.6666|\.6666666/.test(body) ? 'YES — DEFECT STILL LIVE' : 'NO — formatted')

  // Stat cards
  for (const stat of ['Pass Rate', 'Average Score', 'Highest Score']) {
    const row = body.split('\n').findIndex((l) => l.includes(stat))
    if (row >= 0) console.log(`${stat}:`, body.split('\n')[row - 1] ?? '?')
  }

  await page.screenshot({ path: '/home/z/my-project/download/verification/screenshots/hardening-results-percentage.png', fullPage: false })
  await browser.close()
}

run().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
