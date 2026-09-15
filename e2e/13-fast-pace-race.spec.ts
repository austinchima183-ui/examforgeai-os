// ============================================================================
// RELEASE CLOSURE — FAST-PACE ANSWER-PERSISTENCE VERIFICATION (13)
// Reproduces the live-measured production race (Ω-RC defect):
//   - student answers Q1 IMMEDIATELY after Start (within the session-create
//     roundtrip window) — previously the click-time save was silently skipped
//     (stale serverSessionId state closure)
//   - submit-time flush previously fired all answers in PARALLEL, racing the
//     server's per-session save lock (is_locked) — losers 400'd and were
//     swallowed by .catch(() => undefined) → answer graded as unanswered
// Fix under test: ref-fallback save + sequential retried flush.
// PASS = score 2/3, grade C, PASSED with instant answering.
// ============================================================================

import { test, expect } from '@playwright/test'
import fs from 'fs'
import { login, collectConsoleErrors } from './helpers'

function resolveExamId(): string {
  // OMEGA_EXAM_ID_13 lets a single suite run give specs 12 and 13 their own
  // fresh exams (the take page blocks re-entry after a graded session).
  if (process.env.OMEGA_EXAM_ID_13) return process.env.OMEGA_EXAM_ID_13
  if (process.env.OMEGA_EXAM_ID) return process.env.OMEGA_EXAM_ID
  try {
    const f = JSON.parse(
      fs.readFileSync('scripts/tmp/verification-exam.json', 'utf-8')
    )
    if (f?.examId) return f.examId
  } catch {
    /* fallthrough */
  }
  throw new Error('No exam id: set OMEGA_EXAM_ID or run create-verification-exam.py')
}

test.describe('Fast-pace answer persistence (Ω-RC)', () => {
  test('instant answers survive the session-create race → 2/3, C, PASSED', async ({ page }) => {
    const examId = resolveExamId()
    const errors = collectConsoleErrors(page)

    let submitResponseJson: unknown = null
    page.on('response', async (res) => {
      if (res.url().includes('/api/cbt/submit') && res.request().method() === 'POST') {
        submitResponseJson = await res.json().catch(() => null)
      }
    })

    await login(page, 'student')

    // ── 1. Open the exam and START — then answer INSTANTLY (the race) ──
    await page.goto(`/exams/${examId}/take`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Instructions')).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: 'Start Exam' }).click()

    // NO settling wait — answer Q1 the instant it renders, inside the
    // session-create roundtrip window. This is the measured race trigger.
    await expect(page.getByText('Question 1', { exact: true })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('radio').nth(1).click() // "4" — correct
    await page.getByRole('button', { name: 'Next' }).click()

    await expect(page.getByText('Question 2', { exact: true })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('radio').nth(2).click() // "Paris" — correct
    await page.getByRole('button', { name: 'Next' }).click()

    await expect(page.getByText('Question 3', { exact: true })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('radio').nth(1).click() // "Mars" — intentionally wrong
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(page.getByText('Submit Exam?')).toBeVisible()
    await page.getByRole('button', { name: 'Submit Exam' }).click()

    // ── 2. Completion screen — server-graded result ──
    await expect(page.getByRole('heading', { name: 'Exam Submitted' })).toBeVisible({
      timeout: 60_000,
    })

    const sp = submitResponseJson as
      | { score?: number; totalMarks?: number; percentage?: number; grade?: string; passed?: boolean }
      | null
    expect(sp, 'POST /api/cbt/submit response captured').toBeTruthy()
    expect(sp!.score).toBe(2) // Q1 MUST survive the race — the defect asserted 1
    expect(sp!.totalMarks).toBe(3)
    expect(sp!.percentage as number).toBeCloseTo(66.666, 0)
    expect(sp!.grade).toBe('C')
    expect(sp!.passed).toBe(true)

    // ── 3. UI reflects the same honest numbers ──
    await expect(page.getByText('66.7%')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Grade')).toBeVisible()
    await expect(page.getByText('PASSED')).toBeVisible()

    // ── 4. Answer review — the frozen snapshot, no "(not answered)" ──
    await expect(page.getByText('Your answer: 4')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Your answer: Paris')).toBeVisible()
    await expect(page.getByText('Your answer: Mars')).toBeVisible()
    await expect(page.getByText('(not answered)')).toHaveCount(0)

    expect(errors).toEqual([])
  })
})
