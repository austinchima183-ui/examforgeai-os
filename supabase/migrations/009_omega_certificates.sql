-- ═══════════════════════════════════════════════════════════════════════════
-- ExamForge AI Ω — Migration 009: Certificate Contract Completion (Ω-21)
--
-- Problem: the landing page promises certificates that are "customizable
-- with your school's branding, include QR codes for digital verification,
-- and can be delivered directly to students via email or downloaded from
-- their portal." The live `certificates` table has only
-- (id, student_id, issued_at, created_at) — verified by PostgREST column
-- probe 2026-09-02 — so none of that is persistable today.
--
-- Fix: extend the table with the full issuance contract (deterministic
-- verification codes, QR-verifiable, school-branded, email-deliverable).
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. What the certificate certifies
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS exam_id uuid REFERENCES public.exams(id) ON DELETE SET NULL;
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.exam_sessions(id) ON DELETE SET NULL;

-- 2. Presentation (portal display + branded print)
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Certificate of Completion';
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'completion'
    CHECK (type IN ('excellence', 'merit', 'pass', 'completion'));
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS score numeric(5,2);
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS grade text;
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS student_name text;
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS exam_title text;

-- 3. Verification contract (QR code target = /verify/certificate/<code>)
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS verification_code text UNIQUE;
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL;

-- 4. Branding snapshot + delivery metadata (JSONB, engine-extensible)
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 5. Indexes for the query patterns (owner lookup, public verification,
--    school analytics)
CREATE INDEX IF NOT EXISTS idx_certificates_student
  ON public.certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_certificates_school
  ON public.certificates(school_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code
  ON public.certificates(verification_code) WHERE verification_code IS NOT NULL;

-- 6. RLS: owner read; school read; INSERT restricted to the owner (the
--    student issues their own certificate from their own graded session);
--    UPDATE only for email-delivery bookkeeping (service role / owner).
DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS owner_read_certificates ON public.certificates';
  EXECUTE 'CREATE POLICY owner_read_certificates ON public.certificates
    FOR SELECT TO authenticated
    USING (
      student_id = auth.uid()
      OR (school_id IS NOT NULL AND public.is_school_member(school_id))
      OR public.get_user_role() = ''super_admin''
    )';

  EXECUTE 'DROP POLICY IF EXISTS owner_insert_certificates ON public.certificates';
  EXECUTE 'CREATE POLICY owner_insert_certificates ON public.certificates
    FOR INSERT TO authenticated
    WITH CHECK (
      student_id = auth.uid()
      OR public.get_user_role() = ''super_admin''
    )';

  EXECUTE 'DROP POLICY IF EXISTS owner_update_certificates ON public.certificates';
  EXECUTE 'CREATE POLICY owner_update_certificates ON public.certificates
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid() OR public.get_user_role() = ''super_admin'')
    WITH CHECK (student_id = auth.uid() OR public.get_user_role() = ''super_admin'')';
END $$;

COMMENT ON COLUMN public.certificates.verification_code IS
  'public verification code — QR target is /verify/certificate/<code>';
COMMENT ON COLUMN public.certificates.metadata IS
  'branding snapshot (school name/logo/primary color) + delivery metadata (channel, message id)';
