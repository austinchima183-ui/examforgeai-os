# ExamForge AI — Release Notes

## EXAMFORGE-RC1-FROZEN (Release Candidate 1, Frozen)

**Release tag**: `EXAMFORGE-RC1-FROZEN`
**Frozen commit**: `879827e66fdafdd9215b90cd7e7d50a38669335c`
**Production**: https://web-alpha-bay-87.vercel.app (Vercel deployment `dpl_Fj9qAR1thTcP3JUXba3z6Nbqre4j`, serves this exact commit)
**Date**: 2026-09-13

---

## What This Release Is

ExamForge AI RC1 is the first release candidate of an examination-platform engine for African schools: role-based portals (student / parent / teacher / school admin / super admin), CBT exam delivery with offline sync, real AI-powered question generation (Gemini via Supabase edge functions, per-user quotas), certificate issuance with public QR verification, subscription billing rails (Flutterwave), and a live-data status page.

This release is the result of a full constitutional certification (PHASE Ω∞): every marketing claim was audited against measured reality, every gate was re-run fresh, 10 uninterrupted stability cycles were completed, and production was deployed and verified to match this exact commit.

## What Changed Since the Pre-RC1 Builds

### Honest product surface (de-fabrication)
- Removed every fabricated claim from all user-facing pages: fake adoption metrics (500+ schools / 120K students / 2M exams), fake testimonials and institutions, fake compliance certifications (SOC 2 Type II, ISO 27001, GDPR "certified"), fake integrations (Moodle, Canvas, Google Workspace, Microsoft 365, WhatsApp, Slack, Zapier, Power BI), fake awards and ratings, fake funding history, fictional status-page incidents.
- Customers / case-study surfaces now present the true stage: a structured pilot program with real pilot telemetry.
- Security page lists certifications honestly as "Roadmap — not yet certified".
- Status page renders live `/api/health` data — no fictional uptime numbers.

### Engineering certification
- All gates green at freeze: TypeScript 0 errors · ESLint 0 errors · build 224/224 pages exit 0 · unit tests 982 passed / 0 failed / 34 skipped (env-gated integration suite) · E2E 36/36 · route sweep 0×5xx · security audit PASS (headers, auth-gating, zero secret leaks, CSRF enforced on 96 mutation routes) · accessibility 0 violations · dependency audit 0 vulnerabilities.
- 10/10 uninterrupted stability cycles from clean state.
- Dead code purged (~4,100+ lines) and dual-lockfile removed.
- Database: 270 tables live, 261 RLS-enabled / 0 disabled, 731 policies; migrations 002–010 applied.

### Deployment (this release)
- Production redeployed via Vercel API from exact commit `879827e`; deployment metadata and content fingerprints verified.
- Post-deploy live verification: smoke 9/9, route sweep 26/26, health endpoints healthy, real auth, real AI generation (336 tokens), public certificate verification `valid: true`, 0 user-facing fabricated claims.

## Known Gaps (documented, non-blocking)

1. No end-to-end real-money Flutterwave transaction has been completed yet (rails verified, keys configured).
2. Email delivery (Resend) not exercised end-to-end.
3. 17 code-referenced tables are absent from the live DB (marketplace-v2, devices, campaigns, etc.) — the referencing features degrade gracefully.
4. Observability is health-endpoint + live status page; Sentry wiring and an external uptime monitor are future work.
5. Stability cycles completed at protocol minimum (10); escalation to 20/50/100 is future verification work.

## Upgrade / Rollback

- Deploy: `POST /v13/deployments` with `gitSource.ref = 879827e…` (or any future SHA after re-certification).
- Rollback: redeploy any prior SHA via the Vercel dashboard/API; note that pre-RC1 production builds contained the fabricated marketing layer and should not be restored.

## Verdict

Repository: **CERTIFIED & FROZEN** · Production: **MATCHES REPOSITORY** · Verification: **COMPLETE** · Stability: **PASSED**
