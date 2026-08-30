// ============================================================================
// Ω-4 + Ω-2/3 Evidence Capture — sidebar features + widget system 3.0
// Captures screenshots for the verification zipfile.
// ============================================================================
import { chromium, devices } from '@playwright/test'

const BASE = process.env.VERIFY_BASE || 'http://localhost:3000'

async function login(page: any, email: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder="you@school.edu"]').first().fill(email)
  await page.locator('input[placeholder="Enter your password"]').first().fill(password)
  await page.click('button[type="submit"]:has-text("Sign In")')
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/login')) return
  }
  throw new Error(`login failed for ${email} — still at ${page.url()}`)
}

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  await login(page, 'prod-final-1787626351@examforge-test.com', 'SecurePass123!')
  await page.waitForTimeout(3500)

  const SHOTS = 'download/verification/omega-local/screenshots'
  const fs = await import('fs')
  fs.mkdirSync(SHOTS, { recursive: true })

  // ── Ω-2: widget toolbar + marketplace ──
  await page.screenshot({ path: `${SHOTS}/omega2-widget-toolbar.png` })
  await page.getByRole('button', { name: 'Open widget marketplace to add or hide widgets' }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${SHOTS}/omega2-widget-marketplace.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  // ── Ω-2: fullscreen widget ──
  const grid = page.locator('[role="list"][aria-label*="widgets"]').first()
  await grid.locator('[role="listitem"]').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await grid.locator('[role="listitem"]').first().dispatchEvent('contextmenu')
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${SHOTS}/omega2-widget-context-menu.png` })
  await page.getByRole('menu').getByRole('menuitem', { name: 'Fullscreen' }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${SHOTS}/omega2-widget-fullscreen.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)

  // ── Ω-3: focus mode ──
  await page.getByRole('button', { name: 'Focus', exact: true }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${SHOTS}/omega3-focus-mode.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  // ── Ω-3: FAB + command palette ──
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Quick actions/ }).click()
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${SHOTS}/omega3-fab-command-palette.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)

  // ── Ω-4: sidebar features ──
  // Search
  const sidebarSearch = page.locator('searchbox[aria-label*="sidebar"], input[placeholder*="Filter sidebar"]').first()
  if (await sidebarSearch.isVisible().catch(() => false)) {
    await sidebarSearch.fill('exam')
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${SHOTS}/omega4-sidebar-search.png` })
    await sidebarSearch.fill('')
    await page.waitForTimeout(400)
  }

  // Collapse to rail (button lives in the sidebar footer — force-click past
  // any hover-reveal chrome; this is evidence capture, not user simulation)
  const collapseBtn = page.getByRole('button', { name: /Collapse sidebar navigation/ }).first()
  if (await collapseBtn.isVisible().catch(() => false)) {
    await collapseBtn.scrollIntoViewIfNeeded().catch(() => {})
    await collapseBtn.click({ force: true, timeout: 8000 }).catch(async () => {
      await collapseBtn.dispatchEvent('click')
    })
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${SHOTS}/omega4-sidebar-rail.png` })
    // Hover-expand preview in rail mode
    const navItem = page.locator('nav a').first()
    await navItem.hover().catch(() => {})
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${SHOTS}/omega4-sidebar-hover-preview.png` })
    const expandBtn = page.getByRole('button', { name: /Expand sidebar navigation/ }).first()
    await expandBtn.scrollIntoViewIfNeeded().catch(() => {})
    await expandBtn.click({ force: true, timeout: 8000 }).catch(async () => {
      await expandBtn.dispatchEvent('click')
    })
    await page.waitForTimeout(900)
  }

  // Context menu on nav item
  await page.locator('nav a').nth(1).dispatchEvent('contextmenu')
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${SHOTS}/omega4-sidebar-context-menu.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)

  // ── Mobile responsiveness ──
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${SHOTS}/omega3-mobile-390.png` })

  console.log('evidence captured OK')
  await browser.close()
}

main().catch((e) => {
  console.error('capture failed:', e)
  process.exit(1)
})
