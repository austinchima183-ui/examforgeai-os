-- ============================================================================
-- ExamForge AI — Migration 006: Billing/Plans Repair
-- ============================================================================
-- Fixes the broken plans_all_admin RLS policy that queries auth.users
-- (permission denied for authenticated role — poisons ALL authenticated
-- access to the plans catalog, including SELECT via the healthy policy).
--
-- Root cause: policies cannot SELECT from auth.users as the authenticated
-- role. The role is available in the JWT (app_metadata.role), so we read
-- it from auth.jwt() instead — no auth.users access required.
-- ============================================================================

-- 1. Repair the super_admin policy on plans (JWT-claim based, no auth.users)
DROP POLICY IF EXISTS plans_all_admin ON public.plans;
CREATE POLICY plans_all_admin ON public.plans
  FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- 2. Keep the public read policy intact (is_active = true)
DROP POLICY IF EXISTS plans_select_authenticated ON public.plans;
CREATE POLICY plans_select_authenticated ON public.plans
  FOR SELECT TO authenticated
  USING (is_active = true);

-- 3. Index for the (tier, billing_cycle) lookup used by checkout
CREATE INDEX IF NOT EXISTS idx_plans_tier_cycle
  ON public.plans (tier, billing_cycle)
  WHERE is_active = true;

-- 4. Grant (no-op if already granted; idempotent safety)
GRANT SELECT ON public.plans TO authenticated;

-- ============================================================================
-- NOTE: Plan catalog data (Starter/Professional/Enterprise × monthly/yearly)
-- is seeded via POST /api/admin/seed-plans (super_admin, CSRF-protected,
-- idempotent) — the service-role client bypasses RLS, so seeding works even
-- before this migration is applied.
-- ============================================================================
