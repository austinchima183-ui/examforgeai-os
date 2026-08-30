// ============================================================================
// ExamForge AI Ω-2/Ω-3 — Widget System 3.0 E2E Verification
// ============================================================================
// Verifies the upgraded widget framework on the student dashboard:
//   1. Toolbar renders (search, filters, marketplace, undo/redo, focus, layouts)
//   2. Widget marketplace: open, search, hide/show widget
//   3. Undo restores a hidden widget
//   4. Context menu (right-click) with real actions
//   5. Fullscreen widget overlay + Escape exit
//   6. Focus mode shows favorites/pinned only + exit
//   7. Widget search filters the grid
//   8. Layout persistence across reload
//   9. FAB (floating action button) opens the command palette
//   10. Offline/online status indicator present
// ============================================================================

import { test, expect, type Page } from '@playwright/test'
import { login } from './helpers'

// Scoped helpers — the widget grid is the only [role=list] with "widgets" label
function grid(page: Page) {
  return page.locator('[role="list"][aria-label*="widgets"]').first()
}
function firstWidget(page: Page) {
  return grid(page).locator('[role="listitem"]').first()
}

// Open the context menu on a widget. Uses dispatchEvent rather than a
// coordinate right-click: Playwright's auto-scroll can park the widget under
// the sticky page toolbar, where a positional right-click hits the toolbar
// instead of the widget. dispatchEvent targets the element itself.
async function openWidgetMenu(page: Page) {
  await firstWidget(page).scrollIntoViewIfNeeded()
  await page.waitForTimeout(200)
  await firstWidget(page).dispatchEvent('contextmenu')
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await page.waitForTimeout(400) // menu enter animation settle
  return menu
}

test.describe('Widget System 3.0', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'student')
    await page.waitForURL('/dashboard/student', { timeout: 45_000 })
    // Wait for hydration + widgets
    await expect(page.locator('[role="list"][aria-label*="widgets"]').first()).toBeVisible({
      timeout: 30_000,
    })
    // Settle: let async widgets (AI insights) finish loading so layout
    // animations complete — right-clicking mid-animation dismisses the menu.
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1500)
  })

  test('toolbar renders with all controls', async ({ page }) => {
    // Search input
    await expect(page.getByLabel('Search dashboard widgets')).toBeVisible()
    // Marketplace button
    await expect(page.getByRole('button', { name: 'Open widget marketplace to add or hide widgets' })).toBeVisible()
    // Undo/redo group
    await expect(page.getByRole('group', { name: 'Layout history' })).toBeVisible()
    // Focus mode (accessible name is "Focus"; details in title)
    await expect(page.getByRole('button', { name: 'Focus', exact: true })).toBeVisible()
    // Saved layouts
    await expect(page.getByRole('button', { name: 'Saved layouts menu' })).toBeVisible()
    // Reset
    await expect(page.getByRole('button', { name: 'Reset dashboard layout to defaults' })).toBeVisible()
    // Connection status
    await expect(page.getByLabel(/Connection (online|offline)/)).toBeVisible()
    // Category filter chips
    await expect(page.getByRole('group', { name: 'Filter widgets by category' }).first()).toBeVisible()
  })

  test('marketplace opens, searches, and hides a widget', async ({ page }) => {
    await page.getByRole('button', { name: 'Open widget marketplace to add or hide widgets' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('Widget Marketplace')).toBeVisible()

    // Search filters the catalog
    await dialog.getByLabel('Search widgets').fill('streak')
    await expect(dialog.getByRole('list', { name: 'Available widgets' }).getByRole('listitem')).toHaveCount(1)

    // Hide the Study Streak widget
    const streakRow = dialog.getByRole('list', { name: 'Available widgets' }).getByRole('listitem').first()
    await streakRow.getByRole('button', { name: /Hide/ }).click()
    await dialog.getByRole('button', { name: 'Done' }).click()
    await expect(dialog).not.toBeVisible()

    // Widget hidden hint appears (scoped to the grid section footer text)
    await expect(page.getByText(/^1 hidden/).first()).toBeVisible()
  })

  test('undo restores hidden widget', async ({ page }) => {
    // Hide via marketplace
    await page.getByRole('button', { name: 'Open widget marketplace to add or hide widgets' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Search widgets').fill('streak')
    await dialog
      .getByRole('list', { name: 'Available widgets' })
      .getByRole('listitem')
      .first()
      .getByRole('button', { name: /Hide/ })
      .click()
    await dialog.getByRole('button', { name: 'Done' }).click()
    await expect(dialog).not.toBeVisible()
    await expect(page.getByText(/^1 hidden/).first()).toBeVisible()

    // Undo
    await page.getByRole('button', { name: 'Undo layout change (Ctrl+Z)' }).click()
    await expect(page.getByText(/^1 hidden/).first()).not.toBeVisible({ timeout: 10_000 })

    // Redo re-hides
    await page.getByRole('button', { name: 'Redo layout change (Ctrl+Shift+Z)' }).click()
    await expect(page.getByText(/^1 hidden/).first()).toBeVisible({ timeout: 10_000 })
  })

  test('context menu opens on right-click with actions', async ({ page }) => {
    const menu = await openWidgetMenu(page)
    await expect(menu.getByRole('menuitem', { name: 'Fullscreen' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Refresh data' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /Favorite/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: /^Pin|^Unpin/ })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Hide widget' })).toBeVisible()

    // Escape closes
    await page.keyboard.press('Escape')
    await expect(menu).not.toBeVisible()
  })

  test('fullscreen overlay opens and exits with Escape', async ({ page }) => {
    const widgetTitle = (await firstWidget(page).getAttribute('aria-label')) ?? ''
    const menu = await openWidgetMenu(page)
    await menu.getByRole('menuitem', { name: 'Fullscreen' }).click()

    const overlay = page.getByRole('dialog', { name: new RegExp(widgetTitle, 'i') }).filter({
      has: page.getByRole('button', { name: 'Exit fullscreen (Escape)' }),
    })
    await expect(overlay).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(overlay).not.toBeVisible()
  })

  test('focus mode shows only favorites and pinned, then exits', async ({ page }) => {
    // Favorite the first widget via context menu
    const menu = await openWidgetMenu(page)
    await menu.getByRole('menuitem', { name: /Favorite/ }).click()
    await page.waitForTimeout(300)

    const before = await grid(page).locator('[role="listitem"]').count()
    expect(before).toBeGreaterThan(1)

    // Toggle focus mode
    await page.getByRole('button', { name: 'Focus', exact: true }).click()
    await expect(page.getByText(/showing favorites and pinned widgets only/)).toBeVisible()

    const during = await grid(page).locator('[role="listitem"]').count()
    expect(during).toBeLessThan(before)
    expect(during).toBeGreaterThanOrEqual(1)

    // Escape exits focus mode
    await page.keyboard.press('Escape')
    const after = await grid(page).locator('[role="listitem"]').count()
    expect(after).toBe(before)
  })

  test('widget search filters the grid live', async ({ page }) => {
    const before = await grid(page).locator('[role="listitem"]').count()
    expect(before).toBeGreaterThan(1)

    await page.getByLabel('Search dashboard widgets').fill('calendar')
    await page.waitForTimeout(400)
    const during = await grid(page).locator('[role="listitem"]').count()
    expect(during).toBeLessThan(before)
    expect(during).toBeGreaterThanOrEqual(1)

    // Clearing restores
    await page.getByLabel('Search dashboard widgets').fill('')
    await page.waitForTimeout(400)
    await expect(grid(page).locator('[role="listitem"]')).toHaveCount(before)
  })

  test('layout persists across reload', async ({ page }) => {
    // Capture the ORIGINAL top widget, then move it down and verify the
    // change survives a reload.
    const originalFirst = await firstWidget(page).getAttribute('aria-label')
    const menu = await openWidgetMenu(page)
    await menu.getByRole('menuitem', { name: 'Move down' }).click()
    await page.waitForTimeout(500)

    // The moved widget is no longer first
    const afterMove = await firstWidget(page).getAttribute('aria-label')
    expect(afterMove).not.toBe(originalFirst)

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(grid(page)).toBeVisible({ timeout: 30_000 })

    // Persistence: reorder survived the reload
    const firstAfter = await firstWidget(page).getAttribute('aria-label')
    expect(firstAfter).not.toBe(originalFirst)
    expect(firstAfter).toBe(afterMove)
  })

  test('FAB opens the command palette', async ({ page }) => {
    const fab = page.getByRole('button', { name: /Quick actions/ })
    await expect(fab).toBeVisible()
    await page.waitForTimeout(600) // FAB entrance animation settle
    await fab.click()

    // The palette is a cmdk overlay — assert via its search input
    const paletteInput = page.getByPlaceholder('Type a command or search...')
    await expect(paletteInput).toBeVisible({ timeout: 10_000 })
    await page.keyboard.press('Escape')
    await expect(paletteInput).not.toBeVisible()
  })

  test('onboarding coach card is dismissible', async ({ page }) => {
    const card = page.getByRole('note').filter({ hasText: 'fully customizable' })
    // The coach card reveals on the user's FIRST interaction (pointer/scroll)
    // — simulate a real user moving the mouse after the dashboard loads.
    await page.mouse.move(400, 300)
    await page.mouse.move(420, 320)
    await expect(card).toBeVisible({ timeout: 10_000 })
    await card.getByRole('button', { name: 'Got it' }).click()
    await expect(card).not.toBeVisible()
    // Stays dismissed after reload
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('[role="list"][aria-label*="widgets"]').first()).toBeVisible({
      timeout: 30_000,
    })
    await page.mouse.move(400, 300)
    await page.waitForTimeout(500)
    await expect(card).not.toBeVisible()
  })
})
