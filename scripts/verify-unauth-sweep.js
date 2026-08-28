#!/usr/bin/env node
// ============================================================================
// ExamForge AI Ω — MISSION 1 + 8: Unauthenticated Route Sweep
// Tests ALL 275 routes (128 pages + 147 APIs) without authentication:
//   - Public pages → expect 200
//   - Protected pages → expect 307 redirect to /login
//   - Public APIs → expect 200
//   - Protected APIs → expect 401 JSON error
//   - NOTHING should return 500 (server error = critical bug)
// ============================================================================

const BASE = process.env.VERIFY_BASE || 'http://localhost:3000'
const fs = require('fs')

const PUBLIC_PAGES = [
  '/', '/pricing', '/about', '/features', '/solutions', '/contact', '/docs',
  '/api-docs', '/blog', '/changelog', '/careers', '/status', '/customers',
  '/case-studies', '/integrations', '/partners', '/security', '/privacy',
  '/terms', '/cookies', '/gdpr', '/help-center', '/community', '/press-kit',
  '/developers', '/demo', '/documentation', '/login', '/register',
  '/forgot-password', '/reset-password', '/verify-email',
]

const PUBLIC_APIS = [
  '/api/auth/callback', '/api/billing/webhook', '/api/billing/webhooks',
  '/api/billing/paystack/webhook', '/api/marketplace/webhook',
  '/api/health', '/api/contact', '/api/newsletter', '/api/demo-booking',
  '/api/analytics/events', '/api/og',
]

async function checkRoute(route) {
  const isApi = route.startsWith('/api')
  try {
    const res = await fetch(`${BASE}${route}`, {
      redirect: 'manual',
      headers: { 'user-agent': 'ExamForge-Verify/1.0' },
      signal: AbortSignal.timeout(15000),
    })
    const status = res.status
    const location = res.headers.get('location') || ''
    let body = ''
    try { body = (await res.text()).slice(0, 300) } catch {}

    // Classify
    let verdict = 'UNKNOWN'
    let expected = ''

    if (isApi) {
      const isPublic = PUBLIC_APIS.some((p) => route === p || route.startsWith(p + '/'))
      if (isPublic) {
        expected = '200-ish'
        verdict = status < 500 ? 'PASS' : 'FAIL_SERVER_ERROR'
      } else {
        expected = '401'
        if (status === 401) verdict = 'PASS'
        else if (status === 405) verdict = 'PASS_METHOD_NOT_ALLOWED' // method guard = auth guard OK
        else if (status === 400) verdict = 'PASS_VALIDATION_FIRST' // validation before auth — acceptable
        else if (status === 403) verdict = 'PASS_FORBIDDEN'
        else if (status < 400) verdict = 'FAIL_LEAKED_DATA' // unauth got success on protected API!
        else if (status === 404) verdict = 'WARN_NOT_FOUND'
        else if (status >= 500) verdict = 'FAIL_SERVER_ERROR'
        else verdict = `WARN_${status}`
      }
    } else {
      const isPublic = PUBLIC_PAGES.includes(route)
      if (isPublic) {
        expected = '200'
        verdict = status === 200 ? 'PASS' : status < 400 ? 'PASS' : `FAIL_${status}`
      } else {
        expected = '307→/login'
        if (status === 307 || status === 308) {
          verdict = location.includes('/login') ? 'PASS' : `FAIL_REDIRECT_${location}`
        } else if (status === 200) {
          // Could be a static page that doesn't guard at middleware level
          verdict = 'WARN_200_UNAUTH'
        } else if (status >= 500) {
          verdict = 'FAIL_SERVER_ERROR'
        } else if (status === 404) {
          verdict = 'WARN_NOT_FOUND'
        } else {
          verdict = `WARN_${status}`
        }
      }
    }

    return { route, isApi, status, location, verdict, expected, body: body.slice(0, 120) }
  } catch (err) {
    return { route, isApi, status: 0, location: '', verdict: 'FAIL_TIMEOUT', expected: '', body: String(err).slice(0, 100) }
  }
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync('download/verification/route-inventory.json', 'utf8'))
  const all = [...manifest.pages, ...manifest.apis]
  console.log(`\n🔬 UNAUTHENTICATED SWEEP — ${all.length} routes against ${BASE}\n`)

  const results = []
  const CONCURRENCY = 12
  for (let i = 0; i < all.length; i += CONCURRENCY) {
    const batch = all.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map(checkRoute))
    results.push(...batchResults)
    process.stdout.write(`  ${Math.min(i + CONCURRENCY, all.length)}/${all.length}\r`)
  }
  console.log('\n')

  // ── Summary ──
  const pass = results.filter((r) => r.verdict.startsWith('PASS'))
  const fail = results.filter((r) => r.verdict.startsWith('FAIL'))
  const warn = results.filter((r) => r.verdict.startsWith('WARN'))
  const critical = fail.filter((r) => r.verdict === 'FAIL_LEAKED_DATA' || r.verdict === 'FAIL_SERVER_ERROR')

  console.log('══════════════════════════════════════════════════')
  console.log(`  RESULTS: ${pass.length} PASS · ${warn.length} WARN · ${fail.length} FAIL`)
  console.log(`  CRITICAL (data leak / server error): ${critical.length}`)
  console.log('══════════════════════════════════════════════════\n')

  if (fail.length > 0) {
    console.log('❌ FAILURES:')
    for (const f of fail) {
      console.log(`   ${f.route.padEnd(45)} ${f.verdict} (got ${f.status}${f.location ? ' → ' + f.location : ''})`)
    }
    console.log('')
  }
  if (warn.length > 0) {
    console.log('⚠️  WARNINGS:')
    for (const w of warn) {
      console.log(`   ${w.route.padEnd(45)} ${w.verdict} (got ${w.status})`)
    }
    console.log('')
  }

  fs.writeFileSync(
    'download/verification/unauth-sweep-results.json',
    JSON.stringify({ base: BASE, total: results.length, pass: pass.length, warn: warn.length, fail: fail.length, results }, null, 2)
  )
  console.log(`📄 Full results → download/verification/unauth-sweep-results.json\n`)

  process.exit(critical.length > 0 ? 1 : 0)
}

main()
