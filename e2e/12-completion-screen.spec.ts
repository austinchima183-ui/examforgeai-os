// ============================================================================
// PHASE Ω UI ASCENSION — COMPLETION SCREEN VERIFICATION (12)
// Full exam submission flow against a deterministic exam:
//   - real server-graded score (2/3 = 66.7%, grade C, PASSED)
//   - answer review snapshot survives clearExam() (Ω-UI fix)
//   - time-used renders from the captured pre-clear value
//   - zero console errors
//
// Exam is provisioned by scripts/tmp/create-verification-exam.py and passed
// via OMEGA_EXAM_ID (or read from scripts/tmp/verification-exam.json).
// ============================================================================

import { test, expect } from '@playwright/test'
import fs from 'fs'
import { login, collectConsoleErrors } from './helpers'

function resolveExamId(): string {
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

test.describe('Completion screen — verified submission flow (Ω-UI)', () => {
  test('student submits → real score, grade, persisted review, time used', async ({ page }) => {
    const examId = resolveExamId()
    const errors = collectConsoleErrors(page)

    // Capture the authoritative submit response
    let submitResponseJson: unknown = null
    page.on('response', async (res) => {
      if (res.url().includes('/api/cbt/submit') && res.request().method() === 'POST') {
        submitResponseJson = await res.json().catch(() => null)
      }
    })

    await login(page, 'student')

    // ── 1. Open the exam ──
    await page.goto(`/exams/${examId}/take`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Instructions')).toBeVisible({ timeout: 30_000 })

    // ── 2. Start ──
    await page.getByRole('button', { name: 'Start Exam' }).click()
    await expect(page.getByText('Question 1', { exact: true })).toBeVisible({ timeout: 15_000 })

    // ── 3. Answer deterministically (options render in creation order):
    //      Q1: [3,4,5,6]     → 4     (correct)
    //      Q2: [London,Berlin,Paris,Madrid] → Paris (correct)
    //      Q3: [Earth,Mars,Jupiter,Venus]    → Mars   (wrong)
    await page.getByRole('radio').nth(1).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Question 2', { exact: true })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('radio').nth(2).click()
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByText('Question 3', { exact: true })).toBeVisible({ timeout: 10_000 })
    await page.getByRole('radio').nth(1).click()

    // ── 4. Submit (footer Submit → confirmation dialog) ──
    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(page.getByText('Submit Exam?')).toBeVisible()
    await page.getByRole('button', { name: 'Submit Exam' }).click()

    // ── 5. Completion screen renders ──
    await expect(page.getByRole('heading', { name: 'Exam Submitted' })).toBeVisible({
      timeout: 30_000,
    })

    // 5a. Server response carried the REAL grading outcome
    const sp = submitResponseJson as Record<string, unknown> | null
    expect(sp, 'POST /api/cbt/submit response captured').toBeTruthy()
    expect(sp!.score).toBe(2)
    expect(sp!.totalMarks).toBe(3)
    expect(sp!.percentage as number).toBeCloseTo(66.666, 0)
    expect(sp!.grade).toBe('C')
    expect(sp!.passed).toBe(true)

    // 5b. UI renders the same server numbers (not a fabricated 0%)
    await expect(page.getByText('66.7%')).toBeVisible()
    await expect(page.getByText('2 / 3 marks')).toBeVisible()
    await expect(page.getByText('Grade C')).toBeVisible()
    await expect(page.getByText('PASSED')).toBeVisible()

    // 5c. Questions-answered fact (3/3 — all were answered)
    await expect(page.getByText('3/3')).toBeVisible()

    // 5d. Answer review — frozen snapshot must survive clearExam()
    await expect(page.getByText('Your Answers')).toBeVisible()
    const review = page.locator('div').filter({ hasText: 'As recorded at submission' }).last()
    await expect(review).toBeVisible()
    const reviewText = await page
      .locator('[data-radix-scroll-area-viewport], .space-y-3')
      .last()
      .innerText()
    expect(reviewText, 'review shows recorded answers, not "(not answered)"').toContain('4')
    expect(reviewText).toContain('Paris')
    expect(reviewText).toContain('Mars')
    expect(reviewText).not.toContain('(not answered)')

    // 5e. Time used renders a real (non-zero) mm:ss value
    const timeCell = page.locator('text=Time used').locator('..')
    await expect(timeCell.getByText(/\d{2}:\d{2}/)).toBeVisible()

    // 5f. Honest copy: correctness is not claimed client-side
    await expect(
      page.getByText('Correct answers are not shown for this exam')
    ).toBeVisible()

    await page.screenshot({
      path: 'download/verification/screenshots/06-completion-verified.png',
      fullPage: true,
    })

    // ── 6. No console/page errors on the whole journey ──
    expect(errors).toHaveLength(0)
  })
})
