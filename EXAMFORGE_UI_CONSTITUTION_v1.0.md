# EXAMFORGE_UI_CONSTITUTION_v1.0

> The binding design law for every authenticated ExamForge AI surface, ratified for the UI Ascension mission.
> The landing page and all marketing surfaces are FROZEN and exempt — this constitution governs the product interior only.

## Article I — Design Principles

1. **Dark by design.** ExamForge is a focused "AI Operating System" (Linear × Vercel school). One theme, executed perfectly. We never ship a control that does nothing.
2. **Honest pixels.** If a number is on screen, it is real. If a card says "AI", an AI model produced it; rule-based surfaces are labeled "Smart". Zero fabricated metrics, zero fake celebration.
3. **Calm over loud.** Ambient glass, low-alpha tints, generous whitespace. Motion is a whisper (150–400ms, ease-out, reduced-motion respected), never a spectacle — except one moment: exam completion.
4. **The exam is sacred.** During a live exam the student sees exam chrome only. No sidebar, no AI assistant, no floating buttons, no distractions.
5. **Every state is designed.** Loading (skeletons), empty (guidance + next action), error (cause + retry), offline (durable-trust messaging). A feature without these states is unfinished.
6. **Protect the certified core.** No backend architecture, DB schema, auth, or AI-infrastructure changes. API changes are permitted only as bug fixes or read-only additions clearly required by the UI truth.

## Article II — Color System (fixed tokens, no raw hex)

| Token | Value | Use |
|---|---|---|
| background / void | `#090909` | canvas |
| card / layer-2 | `#171717` | surfaces |
| popover / layer-3 | `#1D1D1D` | overlays |
| primary | `#3B82F6` | primary actions, links, focus |
| primary-action | `#2563EB` | solid buttons |
| neural (AI) | `#22D3EE` | anything AI-touched |
| ember | `#F59E0B` | warnings, scheduled/energy |
| forge-gold | `#FBBF24` | achievements, excellence |
| success | `#10B981` (+ teal gradient for completion) | passed, online |
| destructive | `#DC2626` | failure, danger |
| charts 1–5 | blue/emerald/amber/red/violet 500s | series order |

Rules: functional tinting at `/10–/20` alpha; **no indigo, no violet outside chart-5, no light-mode classes** (`bg-*-50`) in this dark-only app; new UI uses semantic tokens (`bg-card`, `text-muted-foreground`, `border`), never raw hex.

## Article III — Typography

- Inter (loaded) is the only UI face. h1 `text-2xl sm:text-3xl font-bold tracking-tight` — exactly one per page, via `PageHeader`/`HeroSection`.
- Section labels: 10–11px uppercase `tracking-[0.14em] text-foreground/40`. Body: `text-sm text-muted-foreground`. Stats: `tabular-nums font-bold`.
- Mono (`--font-geist-mono`) for timers, codes, IDs — must actually be loaded (known gap, fix on touch).

## Article IV — Component Rules

1. Stats = `KpiCard`/`KpiGrid` (animated counters, trend chips). Hand-rolled stat cards and legacy `stat-card.tsx` are retired on touch.
2. Lists = `DataTable` (TanStack). Domain tables compose it; mobile gets horizontal scroll with sticky first column until the card-transform ships.
3. Empty = `EmptyState` (icon glow, guidance, next-action CTA). Loading = structural `Skeleton` with `forge-shimmer`. 
4. Widgets live in the `WidgetGrid` system only. Dashboards never invent parallel widget chrome.
5. Forms use react-hook-form + zod; destructive actions always confirm; async actions show optimistic/progress state.
6. Touch targets ≥44px. Focus-visible ring = `forge-focus-ring`.

## Article V — Animation Rules

- Page transitions 0.25s; stagger children ≤80ms offset; hover-lift ≤2px; `press-effect` on buttons.
- `prefers-reduced-motion`: all transforms collapse to opacity or none.
- One celebration per journey: exam pass (≥ pass mark) earns confetti + gradient score reveal. Nothing else confettis.

## Article VI — Spacing & Layout

4px base scale. Page rhythm `space-y-6`; grids `gap-4`; cards `p-4 sm:p-6`; shell main `p-4 sm:p-6 lg:p-8`; stat grids `sm:grid-cols-2 lg:grid-cols-4`. Radii: cards `rounded-xl`, controls `rounded-lg`, pills full.

## Article VII — Responsive Rules

Mobile-first staircase `sm: → md: → lg: → xl:`. Sidebar auto-collapses <1024px; navigator panels become Sheets <lg; exam footer actions icon-only <sm with labels `sr-only`. Tables scroll horizontally (sticky first column); no content is ever clipped or overlapped. All flows operable one-handed at 390px.

## Article VIII — Accessibility Rules

WCAG 2.1 AA floor: semantic landmarks (`main/nav/header`), skip-nav, keyboard paths for everything (roving tabindex in nav grids), `aria-live` for async status, visible focus always, contrast ≥4.5:1 (tokens guarantee; custom colors must be checked), alt text, 44px targets, `sr-only` labels on icon-only buttons.

## Article IX — Student Experience Philosophy

The student dashboard is a **Command Center**: "Here is where you are, here is what is next, here is how you get better." Hierarchy: (1) next exam / continue learning, (2) progress truth (score trend, streak), (3) AI practice & tutoring one click away, (4) achievements as earned reward. Students never see teacher telemetry (Create buttons, Participants columns, Monitor links). After an exam: instant truthful score, celebration on pass, certificate when earned, "practice your weak areas" as the follow-up.

## Article X — Ratification

This constitution binds PHASE 5 implementation and PHASE 6 verification. Any change that violates a clause is a defect. Amendments require a new mission with fresh measurement.
