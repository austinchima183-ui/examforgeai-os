# ExamForge AI Ω — Permission & Security Audit Report

Generated: 2026-08-26T01:27:16.340540Z

## Summary

- **Page routes scanned**: 124
- **API routes scanned**: 146
- **Server actions found**: 45
- **Security surface findings**: 109
- **RLS-relevant paths**: 8
- **Pages needing review**: 65
- **APIs needing review**: 85

## Mission 4 — Permission Audit

### Page Routes — Status Summary

| Status | Count | Description |
|--------|-------|-------------|
| OK | 59 | Has auth guard (`requireAnyRole`/`requireAuth`) OR is public |
| REVIEW | 65 | Missing visible auth guard — review for fallback patterns |

#### Pages Needing Review (65)

- `src/app/(app)/government/page.tsx` — route `/app/(app)/government` (client: True)
- `src/app/(app)/reports/page.tsx` — route `/app/(app)/reports` (client: True)
- `src/app/(app)/notifications/page.tsx` — route `/app/(app)/notifications` (client: True)
- `src/app/(app)/workflows/page.tsx` — route `/app/(app)/workflows` (client: True)
- `src/app/(app)/settings/page.tsx` — route `/app/(app)/settings` (client: True)
- `src/app/(app)/search/page.tsx` — route `/app/(app)/search` (client: True)
- `src/app/(app)/forbidden/page.tsx` — route `/app/(app)/forbidden` (client: True)
- `src/app/(app)/profile/page.tsx` — route `/app/(app)/profile` (client: True)
- `src/app/(app)/dashboard/page.tsx` — route `/app/(app)/dashboard` (client: False)
- `src/app/(app)/government/district-intelligence/page.tsx` — route `/app/(app)/government/district-intelligence` (client: True)
- `src/app/(app)/marketplace/v2/page.tsx` — route `/app/(app)/marketplace/v2` (client: True)
- `src/app/(app)/marketplace/cart/page.tsx` — route `/app/(app)/marketplace/cart` (client: True)
- `src/app/(app)/notifications/history/page.tsx` — route `/app/(app)/notifications/history` (client: True)
- `src/app/(app)/notifications/templates/page.tsx` — route `/app/(app)/notifications/templates` (client: True)
- `src/app/(app)/student/revision-hub/page.tsx` — route `/app/(app)/student/revision-hub` (client: True)
- `src/app/(app)/student/practice/page.tsx` — route `/app/(app)/student/practice` (client: True)
- `src/app/(app)/student/certificates/page.tsx` — route `/app/(app)/student/certificates` (client: True)
- `src/app/(app)/student/progress/page.tsx` — route `/app/(app)/student/progress` (client: True)
- `src/app/(app)/student/flashcards/page.tsx` — route `/app/(app)/student/flashcards` (client: True)
- `src/app/(app)/student/ai-tutor/page.tsx` — route `/app/(app)/student/ai-tutor` (client: True)
- `src/app/(app)/student/study-planner/page.tsx` — route `/app/(app)/student/study-planner` (client: True)
- `src/app/(app)/student/explain/page.tsx` — route `/app/(app)/student/explain` (client: True)
- `src/app/(app)/admin/backups/page.tsx` — route `/app/(app)/admin/backups` (client: True)
- `src/app/(app)/admin/audit-logs/page.tsx` — route `/app/(app)/admin/audit-logs` (client: True)
- `src/app/(app)/admin/users/page.tsx` — route `/app/(app)/admin/users` (client: True)
- `src/app/(app)/admin/agents/page.tsx` — route `/app/(app)/admin/agents` (client: True)
- `src/app/(app)/admin/plugins/page.tsx` — route `/app/(app)/admin/plugins` (client: True)
- `src/app/(app)/admin/integrations/page.tsx` — route `/app/(app)/admin/integrations` (client: True)
- `src/app/(app)/admin/security/page.tsx` — route `/app/(app)/admin/security` (client: True)
- `src/app/(app)/admin/organization-settings/page.tsx` — route `/app/(app)/admin/organization-settings` (client: True)

_...and 35 more_


### API Routes — Status Summary

| Status | Count | Description |
|--------|-------|-------------|
| OK | 61 | Has `requireSupabase()` auth check |
| PUBLIC | 0 | Public endpoint (intentional) |
| REVIEW | 85 | Missing auth — review for fallback patterns |

#### APIs Needing Review (85)

- `src/app/api/reports/route.ts` — methods: GET
- `src/app/api/analytics/route.ts` — methods: GET
- `src/app/api/search/route.ts` — methods: GET
- `src/app/api/seed/route.ts` — methods: GET
- `src/app/api/health/route.ts` — methods: GET
- `src/app/api/feedback/route.ts` — methods: GET, POST
- `src/app/api/reports/share/route.ts` — methods: POST
- `src/app/api/reports/generate/route.ts` — methods: POST
- `src/app/api/notifications/send/route.ts` — methods: POST
- `src/app/api/notifications/preferences/route.ts` — methods: GET, PUT
- `src/app/api/notifications/digest/route.ts` — methods: GET, POST
- `src/app/api/admin/audit-logs/route.ts` — methods: GET
- `src/app/api/admin/users/route.ts` — methods: GET, POST, PUT, DELETE
- `src/app/api/admin/plugins/route.ts` — methods: GET, POST
- `src/app/api/admin/integrations/route.ts` — methods: GET, POST, PUT
- `src/app/api/admin/organization-settings/route.ts` — methods: GET, PUT
- `src/app/api/admin/roles/route.ts` — methods: GET, PUT
- `src/app/api/admin/branding/route.ts` — methods: GET, PUT
- `src/app/api/agents/[id]/execute/route.ts` — methods: POST
- `src/app/api/billing/enterprise/route.ts` — methods: GET, POST
- `src/app/api/billing/revenue/route.ts` — methods: GET
- `src/app/api/billing/webhook/route.ts` — methods: POST
- `src/app/api/billing/refunds/route.ts` — methods: POST, PATCH
- `src/app/api/billing/audit/route.ts` — methods: GET
- `src/app/api/billing/subscription-lifecycle/route.ts` — methods: POST, PATCH
- `src/app/api/billing/webhooks/route.ts` — methods: POST
- `src/app/api/billing/invoices/route.ts` — methods: GET, POST
- `src/app/api/billing/subscriptions/route.ts` — methods: GET, POST
- `src/app/api/billing/paystack/checkout/route.ts` — methods: POST
- `src/app/api/billing/paystack/webhook/route.ts` — methods: POST

_...and 55 more_


### Server Actions (45)

| Action | File | Has Auth |
|--------|------|----------|
| `createClient` | `src/lib/supabase/server.ts` | ✅ |
| `createClientOrNull` | `src/lib/supabase/server.ts` | ✅ |
| `requireSupabase` | `src/lib/supabase/server.ts` | ✅ |
| `createFeedback` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `getFeedback` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `getFeedbackById` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `updateFeedback` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `deleteFeedback` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `addComment` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `getComments` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `assignFeedback` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `submitAIRating` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `submitResultDispute` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `getFeedbackAnalytics` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `uploadScreenshot` | `src/lib/feedback/feedback-service.ts` | ✅ |
| `getFeedbackOverview` | `src/lib/feedback/analytics-service.ts` | ✅ |
| `getFeedbackTrends` | `src/lib/feedback/analytics-service.ts` | ✅ |
| `getFeedbackByCategory` | `src/lib/feedback/analytics-service.ts` | ✅ |
| `getResolutionMetrics` | `src/lib/feedback/analytics-service.ts` | ✅ |
| `getTopReporters` | `src/lib/feedback/analytics-service.ts` | ✅ |
| `getAIRatingSummary` | `src/lib/feedback/analytics-service.ts` | ✅ |
| `markNotificationReadAction` | `src/features/notifications/actions.ts` | ✅ |
| `markAllNotificationsReadAction` | `src/features/notifications/actions.ts` | ✅ |
| `deleteNotificationAction` | `src/features/notifications/actions.ts` | ✅ |
| `createUserAction` | `src/features/users/actions.ts` | ✅ |
| `updateUserAction` | `src/features/users/actions.ts` | ✅ |
| `deactivateUserAction` | `src/features/users/actions.ts` | ✅ |
| `changeUserRoleAction` | `src/features/users/actions.ts` | ✅ |
| `createExamAction` | `src/features/exams/actions.ts` | ✅ |
| `createQuestionAction` | `src/features/exams/actions.ts` | ✅ |
| `updateExamAction` | `src/features/exams/actions.ts` | ✅ |
| `deleteExamAction` | `src/features/exams/actions.ts` | ✅ |
| `duplicateExamAction` | `src/features/exams/actions.ts` | ✅ |
| `publishExamAction` | `src/features/exams/actions.ts` | ✅ |
| `updateQuestionAction` | `src/features/exams/actions.ts` | ✅ |
| `deleteQuestionAction` | `src/features/exams/actions.ts` | ✅ |
| `createSchoolAction` | `src/features/schools/actions.ts` | ✅ |
| `updateSchoolAction` | `src/features/schools/actions.ts` | ✅ |
| `deactivateSchoolAction` | `src/features/schools/actions.ts` | ✅ |
| `bookDemo` | `src/features/marketing/actions/demo-booking.action.ts` | ✅ |
| `submitContactForm` | `src/features/marketing/actions/contact.action.ts` | ✅ |
| `subscribeNewsletter` | `src/features/marketing/actions/newsletter.action.ts` | ✅ |
| `loginAction` | `src/features/auth/actions/login.action.ts` | ✅ |
| `logoutAction` | `src/features/auth/actions/logout.action.ts` | ✅ |
| `signupAction` | `src/features/auth/actions/signup.action.ts` | ✅ |


### Middleware Audit

```json
{
  "file": "src/middleware.ts",
  "checks_auth": true,
  "applies_csp": false,
  "applies_rbac": true,
  "redirects_unauth": true,
  "handles_csrf": false
}
```

### RLS Bypass Paths (8)

| Severity | File | Note |
|----------|------|------|
| INFO | `src/lib/cbt-integrity.ts:658` | RPC call to 'auto_grade_exam' — verify the function has SECURITY DEFINER + appropriate role checks |
| INFO | `src/lib/billing/subscription-service.ts:637` | RPC call to 'increment' — verify the function has SECURITY DEFINER + appropriate role checks |
| INFO | `src/lib/billing/subscription-service.ts:638` | RPC call to 'increment' — verify the function has SECURITY DEFINER + appropriate role checks |
| INFO | `src/lib/marketplace-v2/listing-service.ts:489` | RPC call to 'increment_listing_views' — verify the function has SECURITY DEFINER + appropriate role checks |
| INFO | `src/lib/marketplace-v2/purchase-service.ts:209` | RPC call to 'increment_listing_purchases' — verify the function has SECURITY DEFINER + appropriate role checks |
| INFO | `src/lib/marketplace-v2/purchase-service.ts:229` | RPC call to 'increment_listing_revenue' — verify the function has SECURITY DEFINER + appropriate role checks |
| INFO | `src/lib/marketplace-v2/purchase-service.ts:501` | RPC call to 'increment_listing_downloads' — verify the function has SECURITY DEFINER + appropriate role checks |
| INFO | `src/lib/marketplace-v2/purchase-service.ts:520` | RPC call to 'increment_license_seat_usage' — verify the function has SECURITY DEFINER + appropriate role checks |


## Mission 12 — Security Audit

### Security Surface Findings (109)

### eval_or_function (2)

- **[HIGH]** `src/lib/redis.ts:27` — eval() can execute arbitrary code — replace with safer alternative
- **[HIGH]** `src/lib/rate-limit-distributed.ts:234` — eval() can execute arbitrary code — replace with safer alternative

### service_role_usage (78)

- **[MEDIUM]** `src/lib/supabase/service.ts:26` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/supabase/service.ts:52` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/config/env-validator.ts:42` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/config/env-validator.ts:77` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/config/env-validation.ts:75` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/config/env-validation.ts:291` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/config/secrets-audit.ts:268` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/billing/invoice-service.ts:539` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/billing/refund-service.ts:129` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:30` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:108` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:110` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:176` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:178` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:230` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:232` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:285` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:287` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:339` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths
- **[MEDIUM]** `src/lib/__tests__/rls-policy-audit.test.ts:341` — Service role key bypasses RLS — verify it's only used server-side in trusted admin paths

_...and 58 more_

### hardcoded_secrets (17)

- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:29` — Potential hardcoded secret — should be in env var only
  ```
  const OPENAI_KEY = 'sk-abc123def456ghi789jkl012mno345pqr6'
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:39` — Potential hardcoded secret — should be in env var only
  ```
  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:39` — Potential hardcoded secret — should be in env var only
  ```
  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:43` — Potential hardcoded secret — should be in env var only
  ```
  expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:48` — Potential hardcoded secret — should be in env var only
  ```
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:48` — Potential hardcoded secret — should be in env var only
  ```
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:282` — Potential hardcoded secret — should be in env var only
  ```
  const detected = detectSecretPatterns('Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:297` — Potential hardcoded secret — should be in env var only
  ```
  const input = `JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0In0.sig
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:355` — Potential hardcoded secret — should be in env var only
  ```
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:355` — Potential hardcoded secret — should be in env var only
  ```
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:356` — Potential hardcoded secret — should be in env var only
  ```
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:356` — Potential hardcoded secret — should be in env var only
  ```
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ey
  ```
- **[CRITICAL]** `src/lib/security/__tests__/secret-leak.test.ts:120` — Potential hardcoded secret — should be in env var only
  ```
  const key = 'AIzaSyBabc123def456ghi789jkl012mno345pqr678stu901'
  ```
- **[CRITICAL]** `src/lib/privacy/__tests__/privacy.test.ts:593` — Potential hardcoded secret — should be in env var only
  ```
  const result = sanitizeLogMessage('API call with key sk-abcdefghijklmnopqrst');
  ```
- **[CRITICAL]** `src/lib/privacy/__tests__/privacy.test.ts:594` — Potential hardcoded secret — should be in env var only
  ```
  expect(result).not.toContain('sk-abcdefghijklmnopqrst');
  ```
- **[CRITICAL]** `src/lib/privacy/__tests__/privacy.test.ts:605` — Potential hardcoded secret — should be in env var only
  ```
  const result = sanitizeLogMessage('Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
  ```
- **[CRITICAL]** `src/lib/privacy/__tests__/privacy.test.ts:606` — Potential hardcoded secret — should be in env var only
  ```
  expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
  ```

### dangerouslySetInnerHTML (12)

- **[MEDIUM]** `src/app/(marketing)/layout.tsx:158` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/app/(marketing)/layout.tsx:162` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/app/(marketing)/blog/page.tsx:51` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/components/ui/chart.tsx:83` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/components/marketing/faq-jsonld.tsx:27` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/components/marketing/breadcrumb-jsonld.tsx:25` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/components/seo/howto-jsonld.tsx:36` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/components/seo/course-jsonld.tsx:45` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/components/seo/article-jsonld.tsx:66` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/components/seo/author-jsonld.tsx:48` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/components/seo/organization-jsonld.tsx:64` — Verify input is sanitized before rendering as HTML
- **[MEDIUM]** `src/components/marketing/motion/reduced-motion.tsx:88` — Verify input is sanitized before rendering as HTML



## Critical Issues Summary

❌ **17 potential hardcoded secrets found — see above.**

❌ **2 eval() usages found.**

## Final Scorecard

- Pages with auth guards: 25 / 124
- APIs with auth checks: 61 / 146
- Server actions with auth: 45 / 45
- Hardcoded secrets: 17
- eval() usages: 2
- dangerouslySetInnerHTML usages: 12
- Service role usages: 78
