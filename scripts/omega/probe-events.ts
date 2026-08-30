// Probe: instrument all pointer events during the right-click (string-injected to avoid esbuild __name issue)
import { chromium, devices } from '@playwright/test'

const INSTRUMENT = `
(function () {
  function describe(el) {
    if (!el || !el.getAttributeNames) return 'non-element'
    var attrs = []
    var names = el.getAttributeNames()
    for (var i = 0; i < names.length; i++) {
      var a = names[i]
      var v = el.getAttribute(a)
      if (v && ['aria-label', 'role', 'draggable', 'data-state'].indexOf(a) >= 0) {
        attrs.push(a + '=' + v.slice(0, 70))
      }
    }
    return '<' + el.tagName.toLowerCase() + ' ' + attrs.join(' ') + '>'
  }
  ;['contextmenu', 'click', 'mousedown', 'mouseup', 'dragstart', 'dblclick'].forEach(function (type) {
    document.addEventListener(
      type,
      function (e) {
        console.log('[evt ' + type + '] target=' + describe(e.target) + ' btn=' + e.button + ' prevented=' + e.defaultPrevented)
      },
      true
    )
  })
  var observer = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes.forEach(function (n) {
        if (n && n.getAttribute && (n.getAttribute('role') === 'menu' || n.getAttribute('role') === 'dialog' || n.getAttribute('role') === 'menuitem')) {
          console.log('[mutation-added] role=' + n.getAttribute('role') + ' label=' + (n.getAttribute('aria-label') || n.textContent || '').slice(0, 60))
        }
      })
    })
  })
  observer.observe(document.body, { childList: true, subtree: true })
})()
`

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()

  page.on('console', (msg) => {
    const t = msg.text()
    if (t.startsWith('[evt') || t.startsWith('[mutation')) console.log('  ', t.slice(0, 240))
  })

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  await page.locator('input[placeholder="you@school.edu"]').fill('prod-final-1787626351@examforge-test.com')
  await page.fill('input[placeholder="Enter your password"]', 'SecurePass123!')
  await page.click('button[type="submit"]:has-text("Sign In")')
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000)
    if (!page.url().includes('/login')) break
  }
  await page.waitForTimeout(2500)

  const grid = page.locator('[role="list"][aria-label*="widgets"]').first()
  await grid.waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(1500)

  await page.evaluate(INSTRUMENT)

  const widget = grid.locator('[role="listitem"]').first()
  const box = await widget.boundingBox()
  console.log('widget box before click:', JSON.stringify(box))

  console.log('--- RIGHT CLICK ---')
  await widget.click({ button: 'right' })
  await page.waitForTimeout(2000)

  const menus = await page.getByRole('menu').count()
  const dialogs = await page.getByRole('dialog').count()
  console.log(`RESULT: menus=${menus} dialogs=${dialogs}`)

  await browser.close()
}

main().catch((e) => {
  console.error('probe failed:', e)
  process.exit(1)
})
