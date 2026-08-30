# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 07-cbt-flow.spec.ts >> CBT Exam Flow (student, video recorded) >> student opens exams list → enters exam → interacts → exits
- Location: e2e/07-cbt-flow.spec.ts:13:7

# Error details

```
TimeoutError: page.goto: Timeout 45000ms exceeded.
Call log:
  - navigating to "http://localhost:3000/exams/ba8630ba-37f6-427b-a929-3043d10ae5b2/take", waiting until "domcontentloaded"

```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - generic [ref=f2e2]:
    - generic [ref=f2e3]:
      - navigation "Skip navigation shortcuts":
        - link "Skip to main content" [ref=f2e4] [cursor=pointer]:
          - /url: "#main-content"
        - link "Skip to navigation" [ref=f2e5] [cursor=pointer]:
          - /url: "#sidebar-nav"
      - complementary "Main navigation" [ref=f2e7]:
        - 'button "Workspace: ExamForge AI. Open workspace switcher" [ref=f2e9]':
          - generic [ref=f2e16]:
            - generic [ref=f2e17]: ExamForge AI
            - paragraph [ref=f2e19]: Student · Final
        - searchbox "Filter sidebar navigation" [ref=f2e27]
        - navigation "Primary" [ref=f2e31]:
          - group "Recent" [ref=f2e32]:
            - link "ExamForge AI" [ref=f2e39] [cursor=pointer]:
              - /url: /dashboard/student
            - link "ExamForge AI" [ref=f2e44] [cursor=pointer]:
              - /url: /exams
          - group [ref=f2e49]:
            - button "Collapse Overview section" [expanded] [ref=f2e50]:
              - generic [ref=f2e53]: Overview
            - link "Dashboard" [ref=f2e57] [cursor=pointer]:
              - /url: /dashboard
          - group [ref=f2e64]:
            - button "Collapse Exams section" [expanded] [ref=f2e65]:
              - generic [ref=f2e68]: Exams
            - generic [ref=f2e71]:
              - link "All Exams" [ref=f2e72] [cursor=pointer]:
                - /url: /cbt
              - link "Results" [ref=f2e77] [cursor=pointer]:
                - /url: /results
              - link "Question Bank" [ref=f2e82] [cursor=pointer]:
                - /url: /question-bank
          - group [ref=f2e87]:
            - button "Collapse Student Portal section" [expanded] [ref=f2e88]:
              - generic [ref=f2e91]: Student Portal
            - generic [ref=f2e94]:
              - link "My Dashboard (current page)" [ref=f2e95] [cursor=pointer]:
                - /url: /dashboard/student
                - generic [ref=f2e100]: My Dashboard
                - generic [ref=f2e101]: (current page)
              - link "Practice Mode" [ref=f2e102] [cursor=pointer]:
                - /url: /student/practice
              - link "Flashcards" [ref=f2e108] [cursor=pointer]:
                - /url: /student/flashcards
              - link "AI Tutor" [ref=f2e113] [cursor=pointer]:
                - /url: /student/ai-tutor
              - link "Explain Anything AI" [ref=f2e123] [cursor=pointer]:
                - /url: /student/explain
                - generic [ref=f2e127]: Explain Anything
                - generic [ref=f2e128]: AI
              - link "Study Planner" [ref=f2e129] [cursor=pointer]:
                - /url: /student/study-planner
              - link "Revision Hub" [ref=f2e133] [cursor=pointer]:
                - /url: /student/revision-hub
              - link "Certificates" [ref=f2e137] [cursor=pointer]:
                - /url: /student/certificates
              - link "Progress" [ref=f2e141] [cursor=pointer]:
                - /url: /student/progress
          - group [ref=f2e145]:
            - button "Collapse Teacher Workspace section" [expanded] [ref=f2e146]:
              - generic [ref=f2e149]: Teacher Workspace
          - group [ref=f2e151]:
            - button "Collapse School Admin section" [expanded] [ref=f2e152]:
              - generic [ref=f2e155]: School Admin
          - group [ref=f2e157]:
            - button "Collapse Parent Portal section" [expanded] [ref=f2e158]:
              - generic [ref=f2e161]: Parent Portal
          - group [ref=f2e163]:
            - button "Collapse Government & Policy section" [expanded] [ref=f2e164]:
              - generic [ref=f2e167]: Government & Policy
          - group [ref=f2e169]:
            - button "Collapse Administration section" [expanded] [ref=f2e170]:
              - generic [ref=f2e173]: Administration
          - group [ref=f2e175]:
            - button "Collapse Account section" [expanded] [ref=f2e176]:
              - generic [ref=f2e179]: Account
            - generic [ref=f2e182]:
              - link "Marketplace" [ref=f2e183] [cursor=pointer]:
                - /url: /marketplace
              - link "Search" [ref=f2e189] [cursor=pointer]:
                - /url: /search
              - link "Settings" [ref=f2e194] [cursor=pointer]:
                - /url: /settings
        - generic [ref=f2e199]:
          - generic [ref=f2e203]: AI
          - generic [ref=f2e204]: v2.0
          - button "Pin sidebar (overlay mode)" [ref=f2e205]
        - button "Collapse sidebar navigation" [expanded] [ref=f2e209]
      - button "Quick actions — open the command palette (Ctrl+K)" [ref=f2e212]
      - generic [ref=f2e222]:
        - banner [ref=f2e223]:
          - navigation "breadcrumb" [ref=f2e225]:
            - list [ref=f2e226]:
              - listitem [ref=f2e227]:
                - link "Dashboard" [ref=f2e228] [cursor=pointer]:
                  - /url: /dashboard
              - listitem [ref=f2e229]:
                - generic [ref=f2e230]: /
                - generic [ref=f2e231]: Student Portal
          - generic [ref=f2e232]:
            - button "Search (⌘K)" [ref=f2e233]:
              - generic [ref=f2e237]: Search or type a command...
              - generic: K
            - button "Toggle theme" [ref=f2e238]
            - button "Open AI Copilot" [ref=f2e240]
            - button "Notifications" [ref=f2e241]
            - button "User menu" [ref=f2e242]:
              - generic [ref=f2e243]: FP
        - main "Main content" [ref=f2e245]
    - generic [ref=f2e317]:
      - button "Open AI assistant — How can AI help?" [ref=f2e318]
      - tooltip: How can AI help?
    - button "Open AI Copilot":
      - generic: AI
  - region "Notifications alt+T"
  - alert [ref=f2e324]
```

# Test source

```ts
  1  | // ============================================================================
  2  | // MISSION 9+14 — CBT EXAM FLOW (video recorded)
  3  | // Student opens the published exam → takes it → answers → submits
  4  | // Uses the "E2E Mathematics Verification Test" exam in the database.
  5  | // ============================================================================
  6  | 
  7  | import { test, expect } from '@playwright/test'
  8  | import { login, shot, collectConsoleErrors } from './helpers'
  9  | 
  10 | const PUBLISHED_EXAM_ID = 'ba8630ba-37f6-427b-a929-3043d10ae5b2'
  11 | 
  12 | test.describe('CBT Exam Flow (student, video recorded)', () => {
  13 |   test('student opens exams list → enters exam → interacts → exits', async ({ page }) => {
  14 |     const errors = collectConsoleErrors(page)
  15 | 
  16 |     await login(page, 'student')
  17 |     await page.waitForTimeout(2000)
  18 | 
  19 |     // ── 1. EXAMS LIST ──
  20 |     await page.goto('/exams', { waitUntil: 'domcontentloaded' })
  21 |     await page.waitForTimeout(2500)
  22 |     await shot(page, '06-cbt-exams-list')
  23 | 
  24 |     // ── 2. OPEN THE PUBLISHED EXAM (take page is the student entry point) ──
> 25 |     await page.goto(`/exams/${PUBLISHED_EXAM_ID}/take`, { waitUntil: 'domcontentloaded' })
     |                ^ TimeoutError: page.goto: Timeout 45000ms exceeded.
  26 |     // Wait for the real exam UI (client-side fetch completes) — not just a fixed timeout
  27 |     await page
  28 |       .locator('main', { hasText: /Start Exam|Instructions|Question/i })
  29 |       .waitFor({ timeout: 30_000 })
  30 |       .catch(() => {})
  31 |     await page.waitForTimeout(1500)
  32 |     await shot(page, '06-cbt-exam-detail')
  33 | 
  34 |     // Verify the exam page rendered with content
  35 |     const bodyText = await page.locator('main').innerText().catch(() => '')
  36 |     // The take page should show the exam title, instructions, or start UI
  37 |     expect(bodyText.length).toBeGreaterThan(50)
  38 | 
  39 |     // ── 3. ATTEMPT TO START THE EXAM (if start button exists) ──
  40 |     const startButton = page.locator('button:has-text("Start"), a:has-text("Start"), button:has-text("Begin"), a:has-text("Take")').first()
  41 |     if (await startButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
  42 |       await startButton.click()
  43 |       await page.waitForTimeout(3000)
  44 |       await shot(page, '06-cbt-exam-taking')
  45 | 
  46 |       // If we're in the take page, interact with the first question if present
  47 |       const takeUrl = new URL(page.url()).pathname
  48 |       if (takeUrl.includes('/take')) {
  49 |         // Try selecting the first answer option
  50 |         const firstOption = page.locator('input[type="radio"], input[type="checkbox"]').first()
  51 |         if (await firstOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
  52 |           await firstOption.check().catch(() => {})
  53 |           await page.waitForTimeout(500)
  54 |           await shot(page, '06-cbt-question-answered')
  55 |         }
  56 |       }
  57 |     }
  58 | 
  59 |     // ── 4. RESULTS PAGE still accessible ──
  60 |     await page.goto('/results', { waitUntil: 'domcontentloaded' })
  61 |     await page.waitForTimeout(1500)
  62 |     await shot(page, '06-cbt-results')
  63 | 
  64 |     expect(errors.filter((e) => !e.includes('401') && !e.includes('403'))).toHaveLength(0)
  65 |   })
  66 | })
  67 | 
```