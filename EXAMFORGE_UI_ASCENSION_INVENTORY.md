# EXAMFORGE UI ASCENSION — REALITY INVENTORY (PHASE 1–3)

> Measured 2026-09-14 under RULE ZERO from commit `31bdb47` (RC1 frozen at `879827e` = production).
> Every finding below was verified by direct file reads/greps this session. No memory, no prior-report trust.
> Scope: authenticated product experience. Landing/marketing pages are FROZEN and were only read, never modified.

## 1. Repository Reality

| Check | Measured |
|---|---|
| HEAD | `31bdb47610624d3e7ee2a503fe22416aac985e17` (release commit past `879827e`) |
| Branch | `main` (local = origin) |
| Tree | clean after removing `bun.lock` residue + reverting mode-change on release notes |
| Tag | `EXAMFORGE-RC1-FROZEN` present on `879827e` |
| Dev server | port 3000 recovered after `.env.local` rebuild (was missing; reconstructed from Vercel env storage — real Supabase URL/anon, documented placeholders) |
| Stack | Next.js 16.1.1 · React 19 · Tailwind 4 · shadcn/ui (68 files) · framer-motion · recharts · zustand · TanStack |

## 2. Application Structure

**Route groups**: `(marketing)` 29 pages (FROZEN) · `(public)` 6 auth/verify pages · `(app)` 85 authenticated pages · `(admin)` 7 marketing-CRM pages.

**App shell** (`(app)/layout.tsx` → `EnterpriseAppShell`): fixed 48px glass header + resizable sidebar (220–360px, 9 role-filtered sections, fuzzy search, context menu, workspace switcher) + independently scrolling main + ⌘K command palette + ⌘B sidebar + framer-motion page transitions + `ContextualAIAssistant` floating button on every page.

**Design system**: dark-only "AI OS" identity (Linear × Vercel aesthetic). Palette: void `#090909`, card `#171717`, primary `#3B82F6`, neural-cyan `#22D3EE`, ember `#F59E0B`, gold `#FBBF24`; semantic emerald/destructive; radius 0.75rem; Inter (mono referenced but never loaded); ~40 forge-* utilities (glass tiers, glows, gradients, status lights); typed token layer in `src/lib/design/system.ts`.

**Dashboards**: 4 role dashboards (student/teacher/school-admin/super-admin) sharing `DashboardPage` + `HeroSection` (ambient glows, animated stats) + `KpiGrid` + `QuickActions` + role `WidgetGrid` (12-col, drag/resize/pin/persist per role:user, marketplace, undo/redo, e2e-tested).

## 3. UI Inventory — Verified Defects (upgrade targets)

### CRITICAL (trust-breaking, user-visible)
| # | Area | Defect | Evidence |
|---|---|---|---|
| C1 | CBT | Completion screen shows **0% / FAILED after every submission** — submit API returns no score; client reads `data.score ?? 0` | `api/cbt/submit/route.ts:146-152`; `server-authority.ts:880-885` (grading result discarded); take page `~1213` |
| C2 | CBT | **Answer Review can never render correctly** — gated on `allowReview` key absent from API; compares against `correctAnswer` which API strips; prints raw option UUIDs | `api/cbt/exam/route.ts:73-76,142-151`; take page `1575-1629` |
| C3 | CBT | **Exam runs inside normal app shell** — sidebar + AI assistant floating button accessible **during a live exam** | `(app)/layout.tsx:47`; no `[id]/take/layout.tsx` |
| C4 | Teacher | **Primary CTA 404s** — "New exam" → `/exams/create` (no page) | `routes.ts:68`; used by teacher hero/quick-actions/insights |
| C5 | Teacher | **AI Question Generator save silently no-ops** — `generationId` never set | `ai-question-generator/page.tsx:120,175` |
| C6 | Admin | **`/admin/security` permanently broken** — calls nonexistent `/api/security` | `security/page.tsx:132` |
| C7 | AI | **AI Copilot degrades to raw JSON dump** — per-chunk REPLACE not append; final message = raw SSE wire text; no markdown | `ai-copilot.tsx:473-474,486-487` |
| C8 | Student AI | **100% of student contextual-AI suggestions fail 400** — action keys don't match API cases | `contextual-suggestions.tsx:126-158` vs `api/ai/student/route.ts:81-111` |
| C9 | Security | **Cross-tenant grading data** — `/api/teacher/submissions` GET returns ALL platform submissions to any teacher | `api/teacher/submissions/route.ts:27-76` |

### HIGH
| # | Area | Defect | Evidence |
|---|---|---|---|
| H1 | Student | "Practice Sessions" KPI always 0 (hardcoded); streak derived from it | `dashboard-service.ts:367` |
| H2 | Student | Misdirected CTAs: "Take Exam" → practice route; "View Results" → progress | `dashboard/student/page.tsx:127,135`; `student-widgets.tsx:120` |
| H3 | Student | Exam list is teacher-oriented for students (Create button, Participants column, Monitor links) | `exams/page.tsx:85` (unconditional `CreateExamDialog`) |
| H4 | Results | "View Details" 404s — `/results/[id]`, `/exams/[id]/results` don't exist | `results-table.tsx:125`; `routes.ts:71` |
| H5 | Teacher | 3 dead AI buttons (no handler): question-bank "Generate with AI", exam dialog "Generate", question dialog "Auto-fill" | `question-bank/page.tsx:45-48`; `create-exam-dialog.tsx:206-209`; `create-question-dialog.tsx:210-213` |
| H6 | Teacher | Grading: batch-grader precedence bug assigns 50% to everything; 50-request N+1; exam titles missing | `grading/page.tsx:193,109-117,125-127` |
| H7 | Teacher | Dashboard "pending grading" counts a different table than the grading queue reads | `dashboard-service.ts:251` vs submissions route |
| H8 | School-admin | AI Insights requires manually typing school UUID | `ai-insights/page.tsx ~1085` |

### MEDIUM (design-system hygiene)
| # | Defect | Evidence |
|---|---|---|
| M1 | Theme toggle is a visual no-op — app is dark-only (`:root` ≡ `.dark`), Light option misleads | `globals.css:78-185`; `header.tsx:156-166`; `settings/page.tsx:831-857` |
| M2 | Dead code: `app-shell.tsx`, `sidebar.tsx`, `ui/responsive-table.tsx`, `examforge-intelligence.tsx` (0 importers) | rg-verified |
| M3 | 106 raw `#090909` hardcodes across 47 files bypass tokens | sweep-verified |
| M4 | Off-system colors: indigo in in-shell 404 + district-intelligence ×29; light-mode classes (`bg-green-50` etc.) in certificates/monitor inside dark-only app | `(app)/not-found.tsx:55`; `certificates/page.tsx:449-457`; `monitor/page.tsx:167-173` |
| M5 | `(admin)` marketing CRM uses divergent legacy shell | `(admin)/layout.tsx:109-152` |
| M6 | Three competing stat-card idioms (hand-rolled 30-line cards vs `KpiCard` vs old `stat-card.tsx`) | `exams/page.tsx:94-163` etc. |
| M7 | Tables on mobile = horizontal scroll only (ResponsiveTable dead) | `data-table.tsx:713` |
| M8 | Goals static/global; achievements widget a 3-row stub duplicating richer `/student/progress` badges | `student/page.tsx:99-122`; `student-widgets.tsx:226-261` |
| M9 | "AI Insights" widget is rule-based but labeled AI ("Neural", "AI-powered") | `intelligent-insights.tsx:417-430,1102-1129` |
| M10 | Analytics "Score Distribution" chart plots same data as Overview (mislabeled duplicate) | `analytics/page.tsx:341-352` |
| M11 | `--font-geist-mono` referenced but never loaded | `globals.css:10,697` |
| M12 | (app) loading skeleton mismatches real shell dimensions (h-16 vs h-12 header) | `(app)/loading.tsx:14,44` |
| M13 | Flagged-for-review lost on reload (component state, not persisted) | take page `~574` |
| M14 | Timer client-clock driven; heartbeat never re-syncs `remainingSeconds` | take page `~760-773,1036-1038` |

## 4. Verified working (protect, do not regress)

- CBT engine: 5-phase flow, 9 question types, per-change autosave → IndexedDB (Dexie) → server with retry, offline queue + reconnect flush + idempotent 409 path, anti-cheat (tab-visibility, multi-tab BroadcastChannel, copy/paste block), server-authoritative submission + tamper detection.
- Widget system: drag/resize/pin/marketplace/undo-redo, per-role persistence — 11 e2e tests green.
- AI Tutor (student flagship): correct buffered SSE parsing, markdown, 4 modes.
- Realtime exam monitor, grading queue with per-submission AI grading, RBAC default-deny middleware, 277-route sweep 0×5xx at RC1, a11y 0 violations, honest empty states, `EmptyState` premium component, 7 structural `loading.tsx` skeletons.

## 5. Upgrade priority (what PHASE 5 executes, in mission order)

1. **Student Dashboard → Student Command Center** (C1 completion score feeds directly into student trust; H1, H2, H8, M8, M9)
2. **CBT Experience** (C1, C2, C3, M13, M14, keyboard shortcuts, completion celebration + certificate bridge)
3. **AI Learning Experience** (C7, C8, honest insight labels)
4. **Teacher/Admin** (C4, C5, C6, C9, H5, H6, H7, H8, M10)
5. **Mobile** (verify 390px exam flow, fix M4/M12 residues)

The full before/after matrix, files changed, and test evidence land in the FINAL DELIVERY REPORT (PHASE 6).
