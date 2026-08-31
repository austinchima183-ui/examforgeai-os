// Try to seed plans table through authenticated session (RLS-permitted insert)
import { chromium } from 'playwright'
import fs from 'fs'

const TARGET = process.argv[2] || 'http://localhost:3000'

const USD = 1500
const PLANS = [
  { name: 'Starter (Monthly)', tier: 'starter', price: 49 * USD, currency: 'NGN', billing_cycle: 'monthly',
    features: ['Up to 500 students', 'AI question generation (100/month)', 'CBT exam delivery', 'Auto-marking objective questions', 'Basic analytics', 'SIS', 'Email notifications', 'Standard support'],
    max_students: 500, max_ai_questions: 100, max_exams: 50, is_active: true,
    metadata: { display_name: 'Starter', usd_monthly: 49, sort_order: 1 } },
  { name: 'Starter (Yearly)', tier: 'starter', price: 39 * USD * 12, currency: 'NGN', billing_cycle: 'yearly',
    features: ['Up to 500 students', 'AI question generation (100/month)', 'CBT exam delivery', 'Auto-marking objective questions', 'Basic analytics', 'SIS', 'Email notifications', 'Standard support'],
    max_students: 500, max_ai_questions: 100, max_exams: 50, is_active: true,
    metadata: { display_name: 'Starter', usd_yearly: 39, sort_order: 1 } },
  { name: 'Professional (Monthly)', tier: 'professional', price: 149 * USD, currency: 'NGN', billing_cycle: 'monthly',
    features: ['Up to 5,000 students', 'Unlimited AI question generation', 'AI auto-marking all types', 'Live exam monitoring', 'Predictive analytics', 'Full School ERP', 'Billing & payments', 'Marketplace access', 'Parent portal', 'Priority support'],
    max_students: 5000, max_ai_questions: 100000, max_exams: 1000, is_active: true,
    metadata: { display_name: 'Professional', usd_monthly: 149, sort_order: 2 } },
  { name: 'Professional (Yearly)', tier: 'professional', price: 119 * USD * 12, currency: 'NGN', billing_cycle: 'yearly',
    features: ['Up to 5,000 students', 'Unlimited AI question generation', 'AI auto-marking all types', 'Live exam monitoring', 'Predictive analytics', 'Full School ERP', 'Billing & payments', 'Marketplace access', 'Parent portal', 'Priority support'],
    max_students: 5000, max_ai_questions: 100000, max_exams: 1000, is_active: true,
    metadata: { display_name: 'Professional', usd_yearly: 119, sort_order: 2 } },
  { name: 'Enterprise (Custom)', tier: 'enterprise', price: 0, currency: 'NGN', billing_cycle: 'monthly',
    features: ['Unlimited students & schools', 'SSO/SAML', 'Dedicated success manager', 'Custom integrations', 'SLA 99.9%', '24/7 support'],
    max_students: null, max_ai_questions: null, max_exams: null, is_active: true,
    metadata: { display_name: 'Enterprise', custom_pricing: true, sort_order: 3 } },
]

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
  console.log('✓ super_admin login')

  const result = await page.evaluate(async (plans) => {
    const cookies = document.cookie.split(';').map(c => c.trim())
    const authCookie = cookies.find(c => c.startsWith('sb-') && c.includes('auth-token'))
    if (!authCookie) return { error: 'no auth cookie' }
    const raw = decodeURIComponent(authCookie.split('=').slice(1).join('='))
    const b64 = raw.replace(/^base64-/, '')
    const json = JSON.parse(atob(b64))
    const url = 'https://pzfnptrrnxkgodclyhft.supabase.co'
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6Zm5wdHJybnhrZ29kY2x5aGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNzg1NDksImV4cCI6MjEwMDc1NDU0OX0.lNvu4mywQIZUIutggf8fDf0a4JPc8fZTAZvxru9adKg'

    // 1. First try INSERT (may be blocked by RLS)
    const insertRes = await fetch(`${url}/rest/v1/plans`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${json.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(plans),
    })
    const insertBody = await insertRes.text()
    return { insertStatus: insertRes.status, insertBody: insertBody.slice(0, 500) }
  }, PLANS)

  console.log('INSERT RESULT:', JSON.stringify(result, null, 2))
  fs.writeFileSync('download/verification/audit/plans-insert.json', JSON.stringify(result, null, 2))
  await browser.close()
})().catch(e => { console.error('FATAL:', String(e).slice(0, 300)); process.exit(1) })
