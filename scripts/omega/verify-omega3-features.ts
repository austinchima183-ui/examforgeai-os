import { chromium } from '@playwright/test'

/**
 * Ω-3 verification: batch edit + dock panel + autosave + settings page.
 */
async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  // ── 1. School settings page: render + autosave inline edit ──
  console.log('=== 1. /school/settings (school admin) ===')
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"], input[name="email"]', 'e2e-superadmin@examforge-test.com')
  await page.fill('input[type="password"], input[name="password"]', 'SuperAdmin123!')
  await page.click('button[type="submit"]')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 45000 })

  await page.goto('http://localhost:3000/school/settings', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const header = await page.locator('h1').first().innerText().catch(() => '<none>')
  console.log('page h1:', header)
  const editableFields = await page.locator('[role="button"][aria-label^="Edit"]').count()
  console.log('inline-editable fields:', editableFields)

  // click the "Edit Motto" field → editor opens → autosave indicator appears
  const mottoField = page.locator('[aria-label^="Edit Motto"]').first()
  if (await mottoField.isVisible({ timeout: 4000 }).catch(() => false)) {
    await mottoField.click()
    await page.waitForTimeout(400)
    const hasEditor = await page.locator('input[aria-label="Edit Motto"], textarea[aria-label="Edit Motto"]').count()
    console.log('motto editor opened:', hasEditor > 0)
    const autosaveHint = await page.getByText(/Autosave on|Autosaving|Autosaved/).count()
    console.log('autosave indicator present:', autosaveHint > 0)
    // type a value → wait for the debounce → expect Autosaved
    await page.fill('input[aria-label="Edit Motto"], textarea[aria-label="Edit Motto"]', 'Knowledge. Integrity. Excellence.')
    await page.waitForTimeout(3500)
    const saved = await page.getByText('Autosaved').count()
    console.log('autosave committed (Autosaved shown):', saved > 0)
    await page.keyboard.press('Escape')
  } else {
    console.log('NOTE: Motto field not found — listing available edit labels')
    const labels = await page.locator('[aria-label^="Edit"]').allInnerTexts().catch(() => [])
    console.log('labels:', labels.slice(0, 6))
  }

  // ── 2. Students table: selection + batch edit + dock panel ──
  console.log('\n=== 2. /students (batch edit + dock) ===')
  await page.goto('http://localhost:3000/students', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)
  const rowCount = await page.locator('[aria-label="Data table"] [data-row-index]').count()
  console.log('student rows rendered:', rowCount)

  // select first row checkbox
  const firstCheck = page.locator('[aria-label="Data table"] [role="checkbox"]').nth(1)
  if (await firstCheck.isVisible({ timeout: 4000 }).catch(() => false)) {
    await firstCheck.click()
    await page.waitForTimeout(600)
    const bulkBar = await page.getByRole('toolbar', { name: 'Bulk actions' }).count()
    const editBtn = await page.getByRole('button', { name: 'Edit', exact: true }).count()
    console.log('bulk action bar visible:', bulkBar > 0)
    console.log('batch Edit button visible:', editBtn > 0)

    // open batch edit dialog
    if (editBtn > 0) {
      await page.getByRole('button', { name: 'Edit', exact: true }).click()
      await page.waitForTimeout(600)
      const dialog = await page.getByRole('dialog').count()
      const statusField = await page.locator('#batch-is_active').count()
      console.log('batch edit dialog open:', dialog > 0)
      console.log('status field present:', statusField > 0)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
    }

    // open details dock via row button
    const dockBtn = page.locator('button[aria-label^="Open details dock for"]').first()
    if (await dockBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dockBtn.click()
      await page.waitForTimeout(900)
      const dock = await page.locator('[role="complementary"][aria-label="Student Details panel"]').count()
      console.log('details dock panel open:', dock > 0)
      const dockText = await page.locator('[role="complementary"]').innerText().catch(() => '')
      console.log('dock shows real data:', /@examforge|Exams taken|Average score/i.test(dockText))
      // collapse to rail + re-expand
      const collapseBtn = page.getByRole('button', { name: 'Collapse Student Details panel to rail' })
      if (await collapseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await collapseBtn.click()
        await page.waitForTimeout(500)
        const rail = await page.getByRole('button', { name: 'Expand Student Details panel' }).count()
        console.log('collapsed to rail:', rail > 0)
        await page.getByRole('button', { name: 'Expand Student Details panel' }).click()
        await page.waitForTimeout(500)
      }
    } else {
      console.log('NOTE: row dock button not found')
    }
  } else {
    console.log('NOTE: no selectable rows rendered (row count ' + rowCount + ')')
  }

  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)) })
  await page.waitForTimeout(1000)
  console.log('\nconsole errors:', errors.length, errors.slice(0, 3))

  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
