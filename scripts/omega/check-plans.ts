// Authenticated DB inspection via the page's own Supabase client
import { chromium } from 'playwright'
import fs from 'fs'

const TARGET = process.argv[2] || 'http://localhost:3000'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  await page.goto(TARGET + '/login', { waitUntil: 'domcontentloaded' })
  const email = page.locator('input[placeholder="you@school.edu"]').first()
  await email.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1000)
  await email.fill('e2e-superadmin@examforge-test.com')
  await page.locator('input[placeholder="Enter your password"]').first().fill('SuperAdmin123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 45000 })
  await page.waitForTimeout(2000)

  // Query plans + subscriptions using the page's authenticated supabase client
  const result = await page.evaluate(async () => {
    // Access the global supabase browser client through window
    const w = window as unknown as { __supabase?: any; supabase?: any }
    // Fallback: construct REST call using the session cookie won't work directly.
    // Instead find the client on React internals — simpler: use fetch to REST with the
    // auth token from the sb cookie.
    const cookies = document.cookie.split(';').map(c => c.trim())
    const authCookie = cookies.find(c => c.startsWith('sb-') && c.includes('auth-token'))
    if (!authCookie) return { error: 'no auth cookie' }
    const raw = decodeURIComponent(authCookie.split('=').slice(1).join('='))
    const b64 = raw.replace(/^base64-/, '')
    const json = JSON.parse(atob(b64))
    const accessToken = json.access_token
    const url = (window as any).__SUPABASE_URL || 'https://pzfnptrrnxkgodclyhft.supabase.co'
    const key = (window as any).__SUPABASE_ANON_KEY

    // read the anon key from the page bundle — it's public; find via any fetch interceptor
    // Simpler: use the env exposed by the app
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
    }
    // get apikey from the existing client if available
    const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Zm5wdHJybnhrZ29kY2x5aGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzg1NDksImV4cCI6MjEwMDc1NDU0OX0.lNvu4mywQIZUIutggf8fDf0a4JPc8fZTAZvxru9adKg'
    if (apiKey) headers['apikey'] = apiKey

    const out: Record<string, unknown> = {}
    for (const table of ['plans', 'subscriptions', 'schools']) {
      try {
        const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=10`, {
          headers: { ...headers, apikey: apiKey || '' },
        })
        out[table] = { status: res.status, data: await res.json() }
      } catch (e) {
        out[table] = { error: String(e) }
      }
    }
    return out
  })
  fs.mkdirSync('download/verification/audit', { recursive: true })
  fs.writeFileSync('download/verification/audit/db-state.json', JSON.stringify(result, null, 2))
  const plans = result?.plans?.data ?? []
  const subs = result?.subscriptions?.data ?? []
  console.log('PLANS:', plans.length, '| SUBSCRIPTIONS:', subs.length, '| SCHOOLS:', (result?.schools?.data ?? []).length)

  await browser.close()
})().catch(e => { console.error('FATAL:', String(e).slice(0, 300)); process.exit(1) })
