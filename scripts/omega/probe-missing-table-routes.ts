// Ω-13/Ω-17: Probe routes that reference missing tables — verify graceful
// degradation vs raw 500s. Runs against local production server.
import { chromium } from 'playwright'
import fs from 'fs'

const TARGET = process.argv[2] || 'http://localhost:3000'

// Routes whose backing tables are missing (from classified drift analysis)
const PROBES = [
  { method: 'GET', path: '/api/settings/api-keys' },          // api_keys
  { method: 'GET', path: '/api/alerting/channels' },          // alert_channels
  { method: 'GET', path: '/api/admin/backups' },              // backups
  { method: 'GET', path: '/api/notifications/templates' },    // notification_templates
  { method: 'GET', path: '/api/settings/webhooks' },          // webhooks
  { method: 'GET', path: '/api/developer/applications' },     // oauth_apps exists? check
  { method: 'GET', path: '/api/security/sessions' },          // session_activity_log
  { method: 'GET', path: '/api/workflows' },                  // workflow_definitions
  { method: 'GET', path: '/api/billing/invoices' },           // plans/invoices
  { method: 'GET', path: '/api/feedback' },                   // feedback
  { method: 'GET', path: '/api/reports/schedules' },          // report_schedules exists
  { method: 'GET', path: '/api/events' },                     // event_analytics
  { method: 'GET', path: '/api/organizations' },              // organizations exists
  { method: 'GET', path: '/api/student/revision-hub' },       // exam_answers?
  { method: 'GET', path: '/api/notifications' },              // notifications exists
]

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  page.on('console', () => {})
  page.on('request', () => {})

  await page.goto(TARGET + '/login', { waitUntil: 'domcontentloaded' })
  const email = page.locator('input[placeholder="you@school.edu"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await email.fill('e2e-superadmin@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('SuperAdmin123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((u: any) => !u.pathname.startsWith('/login'), { timeout: 45000 })
  console.log('✓ logged in as super admin')

  const results: any[] = []
  for (const p of PROBES) {
    try {
      const r = await page.request.get(TARGET + p.path, { timeout: 25000, failOnStatusCode: false })
      let body = ''
      try { body = (await r.text()).slice(0, 200) } catch {}
      const isHtml = body.startsWith('<!DOCTYPE')
      const status = r.status()
      const verdict =
        status < 300 ? 'OK' :
        status === 404 && isHtml ? 'ROUTE-MISSING' :
        status === 403 ? 'FORBIDDEN(gate)' :
        status === 501 || status === 503 ? 'GRACEFUL-DOWN' :
        status === 500 ? 'RAW-500' : `HTTP-${status}`
      results.push({ ...p, status, verdict, body: isHtml ? '(html page)' : body.slice(0, 160) })
      console.log(`${p.path.padEnd(38)} ${String(status).padStart(3)}  ${verdict}`)
    } catch (e: any) {
      results.push({ ...p, status: 0, verdict: 'ERROR', body: e.message.slice(0, 100) })
      console.log(`${p.path.padEnd(38)} ERR  ${e.message.slice(0, 60)}`)
    }
  }

  fs.writeFileSync('/home/z/my-project/download/verification/audit/missing-table-route-behavior.json', JSON.stringify(results, null, 2))
  console.log('\nsaved: download/verification/audit/missing-table-route-behavior.json')
  await browser.close()
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
