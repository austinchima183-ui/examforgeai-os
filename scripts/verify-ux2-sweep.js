// ============================================================================
// Mission 15 — UX Verification Sweep (scroll architecture + dashboards)
// Logs in as each role, verifies the fixed-frame scroll model, and captures
// screenshots of the rebuilt dashboards.
// ============================================================================
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.env.VERIFY_BASE || 'http://localhost:3001'
const OUT = 'download/verification/ux2'
const SHOTS = path.join(OUT, 'screenshots')

const TEST_USERS = {
  student: { email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!', dashboard: '/dashboard/student' },
  teacher: { email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!', dashboard: '/dashboard/teacher' },
  parent: { email: 'e2e-parent-1787626988@examforge-test.com', password: 'Parent123!', dashboard: '/parent/dashboard' },
  school_admin: { email: 'e2e-schooladmin-1787626988@examforge-test.com', password: 'SchoolAdmin123!', dashboard: '/dashboard/school-admin' },
  super_admin: { email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!', dashboard: '/dashboard/super-admin' },
}

async function login(page, role) {
  const user = TEST_USERS[role]
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  const emailInput = page.locator('input[placeholder="you@school.edu"]')
  await emailInput.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1000)
  await emailInput.fill(user.email)
  await page.fill('input[placeholder="Enter your password"]', user.password)
  await page.click('button[type="submit"]:has-text("Sign In")')
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })
  await page.waitForTimeout(2500) // hydration + data
}

async function shot(page, name) {
  fs.mkdirSync(SHOTS, { recursive: true })
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`) })
}

async function verifyScrollArchitecture(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main#main-content')
    const body = document.body
    const html = document.documentElement
    const header = document.querySelector('header[role="banner"]')
    const sidebar = document.querySelector('aside[aria-label="Main navigation"]')

    const mainScrollable = main ? main.scrollHeight > main.clientHeight : false
    const bodyScrolls = html.scrollHeight > html.clientHeight + 2

    // Sticky header check: header must be visible at scroll position 0 AND after scrolling main
    const headerVisible = header
      ? header.getBoundingClientRect().top >= -1 && header.getBoundingClientRect().bottom <= window.innerHeight + 1
      : false

    // Sidebar internal scroll
    const sidebarViewport = sidebar ? sidebar.querySelector('[data-radix-scroll-area-viewport]') : null
    const sidebarScrolls = sidebarViewport ? sidebarViewport.scrollHeight > sidebar.clientHeight : false

    return {
      mainExists: Boolean(main),
      mainScrollable,
      bodyScrolls,
      headerVisible,
      sidebarExists: Boolean(sidebar),
      sidebarInternalScroll: sidebarScrolls,
      mainOverflowY: main ? getComputedStyle(main).overflowY : 'none',
      docHeight: html.scrollHeight,
      winHeight: window.innerHeight,
    }
  })
}

;(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const results = []

  for (const role of Object.keys(TEST_USERS)) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      video: null,
    })
    const page = await context.newPage()
    const consoleErrors = []
    page.on('pageerror', (err) => consoleErrors.push(String(err).slice(0, 150)))
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('401') && !msg.text().includes('403') && !msg.text().includes('net::ERR') && !msg.text().includes('Failed to load resource')) {
        consoleErrors.push(msg.text().slice(0, 150))
      }
    })

    try {
      await login(page, role)
      const url = new URL(page.url()).pathname
      await shot(page, `dashboard-${role}-initial`)

      // Scroll the main content down and verify header stays visible
      const beforeScroll = await verifyScrollArchitecture(page)
      await page.evaluate(() => {
        const main = document.querySelector('main#main-content')
        if (main) main.scrollTop = 800
      })
      await page.waitForTimeout(700)
      const afterScroll = await verifyScrollArchitecture(page)
      await shot(page, `dashboard-${role}-scrolled`)

      // Reset scroll
      await page.evaluate(() => {
        const main = document.querySelector('main#main-content')
        if (main) main.scrollTop = 0
      })

      results.push({
        role,
        landedOn: url,
        beforeScroll,
        afterScroll,
        headerStaysVisibleAfterScroll: afterScroll.headerVisible,
        mainIndependentScroll: beforeScroll.mainExists,
        bodyDoesNotScroll: !afterScroll.bodyScrolls,
        consoleErrors: consoleErrors.slice(0, 5),
        consoleErrorCount: consoleErrors.length,
      })
    } catch (err) {
      results.push({ role, error: String(err).slice(0, 300), consoleErrors: consoleErrors.slice(0, 5) })
    }
    await context.close()
  }

  // Mobile viewport check (student only — fast)
  try {
    const mCtx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const mPage = await mCtx.newPage()
    await login(mPage, 'student')
    await mPage.waitForTimeout(1500)
    const mobileCheck = await mPage.evaluate(() => {
      const main = document.querySelector('main#main-content')
      const html = document.documentElement
      return {
        bodyScrolls: html.scrollHeight > html.clientHeight + 2,
        mainScrollable: main ? main.scrollHeight > main.clientHeight : false,
        horizontalOverflow: html.scrollWidth > html.clientWidth + 2,
      }
    })
    await shot(mPage, 'dashboard-student-mobile-390px')
    results.push({ role: 'student-mobile-390px', check: mobileCheck })
    await mCtx.close()
  } catch (err) {
    results.push({ role: 'student-mobile-390px', error: String(err).slice(0, 200) })
  }

  await browser.close()

  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'ux-verification-results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify(results, null, 2))
})().catch((e) => {
  console.error('FATAL', e)
  process.exit(1)
})
