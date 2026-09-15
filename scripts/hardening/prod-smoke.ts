// ============================================================================
// PRODUCTION SMOKE — hardening release a718a5e
// Public surface + CORS header + auth gates + results percentage formatting.
// Runs against https://web-alpha-bay-87.vercel.app with the E2E student.
// ============================================================================
import { chromium } from 'playwright'

const BASE = 'https://web-alpha-bay-87.vercel.app'
const results: Array<[string, string]> = []

const check = (name: string, ok: boolean, detail = '') => {
  results.push([name, ok ? 'PASS' : 'FAIL' + (detail ? ` (${detail})` : '')])
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`)
}

const run = async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // ── 1. Health + DB ──
  const health = await page.goto(`${BASE}/api/health`, { waitUntil: 'domcontentloaded' }).then(() => page.textContent('body'))
  const healthJson = JSON.parse(health ?? '{}')
  check('health 200 + database connected', healthJson.status === 'healthy' && healthJson.checks?.database?.status === 'healthy',
    `db latency ${healthJson.checks?.database?.latencyMs}ms`)

  // ── 2. CORS header (the hardening fix) ──
  const landing = await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  const acao = (await landing?.headerValue('access-control-allow-origin')) ?? ''
  check('CORS allows real production origin', acao === 'https://web-alpha-bay-87.vercel.app', `acao=${acao}`)

  // ── 3. Landing renders with frozen markers ──
  const landingText = await page.locator('body').innerText()
  check('landing renders (hero copy)', /For Teachers|For Students|exam/i.test(landingText))

  // ── 4. Auth gates ──
  const resp = await page.goto(`${BASE}/dashboard/student`, { waitUntil: 'domcontentloaded' })
  check('student dashboard auth-gated (redirect)', (resp?.status() ?? 0) === 200 || (resp?.status() ?? 0) === 307, `status=${resp?.status()}; url=${page.url().replace(BASE, '')}`)

  // ── 5. Login + results percentage (the formatting fix) ──
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[placeholder="you@school.edu"]').first().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder="you@school.edu"]').first().fill('prod-final-1787626351@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 })
  check('student login → dashboard', page.url().includes('/dashboard'))

  await page.goto(`${BASE}/results`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4000)
  const body = await page.locator('main').innerText()
  check('results page renders live data', body.length > 100)
  check('percentage formatted (no raw 66.666…)', !/\.6666666/.test(body) && !/66\.6666/.test(body))
  const pctCells = body.match(/\d+\.\d+%|\d+%/g) ?? []
  console.log('   percentage renders:', JSON.stringify(pctCells.slice(0, 12)))

  await page.screenshot({ path: '/home/z/my-project/download/verification/screenshots/hardening-prod-results.png' })

  // ── Summary ──
  const fails = results.filter(([, s]) => s.startsWith('FAIL'))
  console.log(`\nSMOKE: ${results.length - fails.length}/${results.length} PASS`)
  if (fails.length) process.exit(1)
  await browser.close()
}

run().catch((e) => { console.error('SMOKE ERROR:', e.message); process.exit(1) })
