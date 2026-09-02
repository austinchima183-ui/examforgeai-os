// Ω-15 verification: prove AI tracking is no longer silent.
// Logs in as a teacher, POSTs a real AI request through the app's engine,
// then greps the server log for the tracking insert/update warning lines.
import { chromium } from 'playwright'
import fs from 'fs'

const TARGET = process.argv[2] || 'http://localhost:3000'
const LOG = process.argv[3] || '/tmp/next-prod.log'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  await page.goto(TARGET + '/login', { waitUntil: 'domcontentloaded' })
  const email = page.locator('input[placeholder="you@school.edu"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await email.fill('e2e-teacher-1787626988@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('Teacher123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 45000 })
  console.log('✓ teacher login')

  // get CSRF token then POST an AI request (mirrors the app's CSRF contract)
  const csrf = await page.evaluate(async () => {
    const r = await fetch('/api/auth/csrf', { method: 'POST' })
    const j = await r.json().catch(() => null)
    return j?.csrfToken ?? j?.token ?? null
  })
  console.log('csrf token acquired:', Boolean(csrf))

  const logBefore = fs.existsSync(LOG) ? fs.statSync(LOG).size : 0

  const aiRes = await page.evaluate(async ({ csrf }) => {
    const r = await fetch('/api/ai/teacher', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrf ?? '',
      },
      body: JSON.stringify({
        prompt: 'Give one study tip for JAMB physics preparation in one sentence.',
      }),
    })
    return { status: r.status, body: (await r.text()).slice(0, 300) }
  }, { csrf })
  console.log('POST /api/ai/teacher →', aiRes.status, aiRes.body.slice(0, 160))

  // give the engine a moment to write tracking records
  await page.waitForTimeout(4000)
  await browser.close()

  // read the NEW portion of the server log — the tracking warnings must be
  // visible (live DB lacks migration-008 columns → insert/update fails →
  // warning logged). Silent failure = defect; visible failure = contract met.
  const logData = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : ''
  const newLog = logData.slice(Math.min(logBefore, logData.length))
  const warnings = newLog.split('\n').filter(l =>
    /tracking|generation (completion|failure) update failed|AI Engine\]/i.test(l)
  )
  console.log('--- server-log tracking lines (post-request) ---')
  for (const w of warnings) console.log('  ', w.slice(0, 220))
  if (warnings.length === 0) {
    console.log('  (none — either tracking succeeded [migration 008 applied] or request never reached the engine)')
  }

  const report = {
    verified_at: new Date().toISOString(),
    endpoint: '/api/ai/teacher',
    api_status: aiRes.status,
    tracking_log_lines: warnings.length,
    tracking_visibility: warnings.length > 0 ? 'VISIBLE (non-silent)' : 'no-warning (check status)',
    log_excerpt: warnings.slice(0, 5).map(w => w.slice(0, 200)),
  }
  fs.mkdirSync('download/verification/audit', { recursive: true })
  fs.writeFileSync(
    'download/verification/audit/ai-tracking-visibility.json',
    JSON.stringify(report, null, 2)
  )
  console.log('saved: download/verification/audit/ai-tracking-visibility.json')
})().catch(e => { console.error('FATAL:', String(e).slice(0, 300)); process.exit(1) })
