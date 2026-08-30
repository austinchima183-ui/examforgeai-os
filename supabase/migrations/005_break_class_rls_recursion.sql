-- ============================================================================
-- Migration 005 — BREAK RLS RECURSION ON CLASS-GRAPH TABLES (42P17)
-- ============================================================================
-- DEFECT (verified 2026-08-29, Ω-1 deep verification):
--   Every authenticated query on classes / class_students / class_subjects /
--   class_teachers / parent_students fails with
--   42P17 "infinite recursion detected in policy for relation \"classes\"".
--
-- ROOT CAUSE:
--   classes SELECT policies subquery class_students / class_subjects
--   (student/teacher visibility), while those tables' policies subquery
--   classes (school membership). PostgreSQL ORs all permissive SELECT
--   policies, so EVERY role (incl. super_admin) triggers the loop.
--   Prior audits missed this: service-key introspection never executes
--   policies; UI E2E asserted rendering, not data presence.
--
-- IMPACT (verified through the app):
--   /api/school/classes → 500 {"error":"Failed to fetch classes"}
--   /school/classes page → "Total Classes 0 / Total Students 0" (false zeros)
--   Same defect exists in PRODUCTION (shared Supabase instance).
--
-- FIX STRATEGY:
--   1. SECURITY DEFINER helper user_can_access_class() — runs as owner,
--      bypasses RLS inside policy subqueries → recursion impossible.
--   2. Drop ALL existing policies on the 5 tables (DO block over
--      pg_policies — handles policy names created outside migrations).
--   3. Recreate a minimal, auditable policy set per table.
--
-- ACCESS NOTE: application requires DDL access (service role key /
-- Supabase platform key / DB password). All three are externally blocked:
-- the service key is stored as a non-decryptable Vercel sensitive value,
-- the platform key is expired, and no DB password exists in the environment.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helper functions (SECURITY DEFINER = recursion-proof)
-- ---------------------------------------------------------------------------

-- Resolve the current user's app role without touching RLS-protected tables.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role::TEXT INTO v_role FROM public.users WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Resolve the current user's school_id (NULL when none).
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID AS $$
DECLARE
  v_school UUID;
BEGIN
  SELECT school_id INTO v_school FROM public.users WHERE id = auth.uid();
  RETURN v_school;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- True when the current user belongs to the given school.
CREATE OR REPLACE FUNCTION public.is_school_member(target_school_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF target_school_id IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND school_id = target_school_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Central class-access decision. ALL policies below delegate here, so no
-- policy ever subqueries an RLS-protected table directly.
CREATE OR REPLACE FUNCTION public.user_can_access_class(target_class_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_class_school UUID;
  v_class_teacher UUID;
  v_role TEXT;
BEGIN
  IF target_class_id IS NULL OR auth.uid() IS NULL THEN RETURN FALSE; END IF;

  SELECT school_id, teacher_id INTO v_class_school, v_class_teacher
  FROM public.classes WHERE id = target_class_id;   -- owner context, no RLS

  IF v_class_school IS NULL AND v_class_teacher IS NULL THEN
    -- class row absent → still allow member checks to yield FALSE below
    RETURN FALSE;
  END IF;

  SELECT public.get_user_role() INTO v_role;

  IF v_role = 'super_admin' THEN RETURN TRUE; END IF;

  IF v_role = 'school_admin' THEN
    RETURN v_class_school IS NOT NULL AND public.is_school_member(v_class_school);
  END IF;

  IF v_role = 'teacher' THEN
    RETURN v_class_teacher = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.class_teachers ct
        WHERE ct.class_id = target_class_id AND ct.teacher_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.class_id = target_class_id AND cs.teacher_id = auth.uid()
      );
  END IF;

  IF v_role = 'student' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.class_students cst
      WHERE cst.class_id = target_class_id
        AND cst.student_id = auth.uid()
        AND cst.is_active = TRUE
    );
  END IF;

  IF v_role = 'parent' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.parent_students ps
      JOIN public.class_students cst ON cst.student_id = ps.student_id
      WHERE ps.parent_id = auth.uid()
        AND cst.class_id = target_class_id
        AND cst.is_active = TRUE
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.user_can_access_class(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_member(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Drop ALL existing policies on the five recursion-affected tables
--    (DO block — catches policies created outside migrations too)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('classes','class_students','class_subjects',
                        'class_teachers','parent_students')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
                   pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Recreate clean, recursion-proof policies
--    Every policy delegates to SECURITY DEFINER helpers only.
-- ---------------------------------------------------------------------------

-- classes ------------------------------------------------------------------
CREATE POLICY "service_role all classes" ON public.classes
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "authenticated select classes" ON public.classes
  FOR SELECT TO authenticated
  USING (public.user_can_access_class(id));

CREATE POLICY "school_admin write classes" ON public.classes
  FOR ALL TO authenticated
  USING (
    public.get_user_role() = 'school_admin'
    AND school_id = public.get_user_school_id()
  )
  WITH CHECK (
    public.get_user_role() = 'school_admin'
    AND school_id = public.get_user_school_id()
  );

-- class_students ------------------------------------------------------------
CREATE POLICY "service_role all class_students" ON public.class_students
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "authenticated select class_students" ON public.class_students
  FOR SELECT TO authenticated
  USING (public.user_can_access_class(class_id));

CREATE POLICY "school_admin manage class_students" ON public.class_students
  FOR ALL TO authenticated
  USING (
    public.get_user_role() = 'school_admin'
    AND public.user_can_access_class(class_id)
  )
  WITH CHECK (
    public.get_user_role() = 'school_admin'
    AND public.user_can_access_class(class_id)
  );

CREATE POLICY "student insert own enrollment" ON public.class_students
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- class_subjects ------------------------------------------------------------
CREATE POLICY "service_role all class_subjects" ON public.class_subjects
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "authenticated select class_subjects" ON public.class_subjects
  FOR SELECT TO authenticated
  USING (public.user_can_access_class(class_id));

CREATE POLICY "school_admin manage class_subjects" ON public.class_subjects
  FOR ALL TO authenticated
  USING (
    public.get_user_role() = 'school_admin'
    AND public.user_can_access_class(class_id)
  )
  WITH CHECK (
    public.get_user_role() = 'school_admin'
    AND public.user_can_access_class(class_id)
  );

-- class_teachers ------------------------------------------------------------
CREATE POLICY "service_role all class_teachers" ON public.class_teachers
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "authenticated select class_teachers" ON public.class_teachers
  FOR SELECT TO authenticated
  USING (public.user_can_access_class(class_id));

CREATE POLICY "school_admin manage class_teachers" ON public.class_teachers
  FOR ALL TO authenticated
  USING (
    public.get_user_role() = 'school_admin'
    AND public.user_can_access_class(class_id)
  )
  WITH CHECK (
    public.get_user_role() = 'school_admin'
    AND public.user_can_access_class(class_id)
  );

-- parent_students -----------------------------------------------------------
CREATE POLICY "service_role all parent_students" ON public.parent_students
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "parents read own links" ON public.parent_students
  FOR SELECT TO authenticated
  USING (
    parent_id = auth.uid()
    OR public.get_user_role() IN ('school_admin','super_admin')
  );

CREATE POLICY "parents manage own links" ON public.parent_students
  FOR ALL TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "school_admin manage parent_students" ON public.parent_students
  FOR ALL TO authenticated
  USING (public.get_user_role() = 'school_admin')
  WITH CHECK (public.get_user_role() = 'school_admin');

-- ---------------------------------------------------------------------------
-- 4. Verification queries (run after applying; all must return rows/TRUE)
-- ---------------------------------------------------------------------------
-- SELECT count(*) FROM classes;                     -- as authenticated: no 42P17
-- SELECT * FROM classes WHERE false;                -- policy plan compiles
-- SELECT count(*) FROM class_students;              -- no 42P17
-- SELECT count(*) FROM parent_students;             -- no 42P17
