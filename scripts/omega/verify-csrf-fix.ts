// OMEGA FIX VERIFICATION — CSRF fix end-to-end (quiet version)
import { chromium } from 'playwright'

const TARGET = process.argv[2] || 'http://localhost:3000'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  page.on('console', () => {})   // silence
  page.on('request', () => {})   // silence

  await page.goto(TARGET + '/login', { waitUntil: 'domcontentloaded' })
  const email = page.locator('input[placeholder="you@school.edu"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  await email.fill('e2e-teacher-1787626988@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('Teacher123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 45000 })
  console.log('✓ Login OK →', page.url().replace(TARGET, ''))

  const results: string[] = []

  // 1. GET lesson plans — no longer CSRF-blocked
  try {
    const r = await page.request.get(TARGET + '/api/teacher/lesson-plans?teacherId=x', { timeout: 20000 })
    results.push(`GET lesson-plans → ${r.status()} ${r.status() === 403 ? '❌ CSRF-BLOCKED' : '✓'}`)
  } catch (e) { results.push(`GET lesson-plans → ERROR ${String(e).slice(0, 60)}`) }

  // 2. CSRF token endpoint
  let token = ''
  try {
    const r = await page.request.get(TARGET + '/api/auth/csrf', { timeout: 20000 })
    const d = await r.json()
    token = d?.token ?? ''
    results.push(`GET /api/auth/csrf → ${r.status()} ${token ? '✓ token' : '❌ no token'}`)
  } catch (e) { results.push(`GET /api/auth/csrf → ERROR`) }

  // 3. Mutation WITH CSRF
  if (token) {
    try {
      const r = await page.request.post(TARGET + '/api/teacher/lesson-plans', {
        headers: { 'x-csrf-token': token },
        data: { title: 'OMEGA Test Lesson', subject: 'Mathematics' },
        timeout: 20000,
      })
      const b = await r.text()
      results.push(`POST lesson-plan (CSRF) → ${r.status()} ${r.status() === 403 ? '❌ ' + b.slice(0, 80) : r.status() < 300 ? '✓ CREATED' : b.slice(0, 80)}`)
    } catch (e) { results.push(`POST lesson-plan → ERROR ${String(e).slice(0, 60)}`) }
  }

  // 4. Mutation WITHOUT CSRF — must be blocked
  try {
    const r = await page.request.post(TARGET + '/api/teacher/lesson-plans', {
      data: { title: 'hack' }, timeout: 20000,
    })
    results.push(`POST no-CSRF → ${r.status()} ${r.status() === 403 ? '✓ blocked (secure)' : '⚠️ NOT BLOCKED'}`)
  } catch { results.push('POST no-CSRF → ERROR') }

  // 5. AI complete WITH CSRF
  if (token) {
    try {
      const r = await page.request.post(TARGET + '/api/ai/complete', {
        headers: { 'x-csrf-token': token },
        data: { prompt: 'Reply with exactly: OMEGA-AI-OK', maxTokens: 20 },
        timeout: 60000,
      })
      const b = await r.text()
      const ok = b.includes('OMEGA-AI-OK') || (r.status() === 200 && b.length > 10)
      results.push(`POST /api/ai/complete → ${r.status()} ${ok ? '✓ AI RESPONDED' : b.slice(0, 150)}`)
    } catch (e) { results.push(`POST /api/ai/complete → ERROR ${String(e).slice(0, 80)}`) }
  }

  for (const r of results) console.log(r)
  await browser.close()
})().catch(e => { console.error('FATAL:', String(e).slice(0, 200)); process.exit(1) })
