// ============================================================================
// Mission 15 — UX Verification Videos
// Records one video per role: login → dashboard → scroll interactions →
// sidebar interactions → responsive check. Evidence for certification.
// ============================================================================
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const BASE = process.env.VERIFY_BASE || 'http://localhost:3000'
const VIDEO_DIR = 'download/verification/ux2/videos'

const USERS = {
  student: { email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!', dashboard: '/dashboard/student' },
  teacher: { email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!', dashboard: '/dashboard/teacher' },
  parent: { email: 'e2e-parent-1787626988@examforge-test.com', password: 'Parent123!', dashboard: '/parent/dashboard' },
  school_admin: { email: 'e2e-schooladmin-1787626988@examforge-test.com', password: 'SchoolAdmin123!', dashboard: '/dashboard/school-admin' },
  super_admin: { email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!', dashboard: '/dashboard/super-admin' },
}

async function recordRole(browser, role) {
  const user = USERS[role]
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  })
  const page = await context.newPage()

  try {
    // 1. Login journey
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    const emailInput = page.locator('input[placeholder="you@school.edu"]').first()
    await emailInput.waitFor({ state: 'visible', timeout: 30000 })
    await page.waitForTimeout(1200)
    await emailInput.fill(user.email)
    await page.waitForTimeout(400)
    await page.fill('input[placeholder="Enter your password"]', user.password)
    await page.waitForTimeout(500)
    await page.click('button[type="submit"]:has-text("Sign In")')
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60000 })
    await page.waitForTimeout(3000) // let dashboard fully render

    // 2. Scroll the main content (demonstrates independent scroll + sticky toolbar)
    await page.evaluate(() => {
      const main = document.querySelector('main#main-content')
      if (main) main.smoothScrollTo ? main.smoothScrollTo({ top: 900 }) : main.scrollTo({ top: 900, behavior: 'smooth' })
    })
    await page.waitForTimeout(1800)
    await page.evaluate(() => {
      const main = document.querySelector('main#main-content')
      if (main) main.scrollTo({ top: 1800, behavior: 'smooth' })
    })
    await page.waitForTimeout(1800)
    await page.evaluate(() => {
      const main = document.querySelector('main#main-content')
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' })
    })
    await page.waitForTimeout(1500)

    // 3. Sidebar interactions: collapse → expand
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(1200)
    await page.keyboard.press('Control+b')
    await page.waitForTimeout(1200)

    // 4. Command palette peek
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(1500)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(800)

    await page.waitForTimeout(1200)
  } catch (e) {
    console.error(`${role}: ${String(e).slice(0, 150)}`)
  }

  // Close context to flush video, then rename
  const video = page.video()
  await page.close()
  const filePath = await video.path()
  const finalPath = path.join(VIDEO_DIR, `ux2-${role}-journey.webm`)
  fs.renameSync(filePath, finalPath)
  await context.close()
  console.log(`saved: ${finalPath}`)
}

;(async () => {
  fs.mkdirSync(VIDEO_DIR, { recursive: true })
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

  // Landing page (locked — verify untouched) video
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  })
  const page = await ctx.newPage()
  await page.goto(`${BASE}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: 'smooth' }))
  await page.waitForTimeout(2000)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await page.waitForTimeout(1500)
  const lvideo = page.video()
  await page.close()
  const lpath = await lvideo.path()
  fs.renameSync(lpath, path.join(VIDEO_DIR, 'landing-locked-verify.webm'))
  await ctx.close()
  console.log('saved: landing video')

  for (const role of Object.keys(USERS)) {
    await recordRole(browser, role)
  }

  await browser.close()
  console.log('ALL VIDEOS RECORDED')
})().catch((e) => { console.error('FATAL', e); process.exit(1) })
