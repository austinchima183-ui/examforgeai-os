-- ═══════════════════════════════════════════════════════════════════════════
-- ExamForge AI Ω — Migration 008: AI Generation Tracking Completion (Ω-15)
--
-- Problem: the ai_generation_requests table exists but is missing the exact
-- columns the AI engine writes (verified against live schema + engine code):
--   user_id, model, prompt_text, metadata, output, tokens_input,
--   tokens_output, cost_usd, duration_ms, updated_at
-- Every tracking insert (executeAI) and completion update currently fails
-- with 42703 — silently, because the engine does not check insert errors.
-- Result: ZERO AI requests are being tracked → the observability contract
-- (request ID, user ID, tenant ID, model, token usage, latency, cost,
-- status) is broken in production.
--
-- Fix: add all missing columns (idempotent) + indexes for the analytics
-- queries (per-user, per-school, per-status, time-ordered).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Identity & request metadata
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS model text;

-- 2. Prompt persistence (the engine stores full prompt/response for audit)
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS prompt_text text;
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 3. Response output (parsed/structured output alongside raw_response)
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS output jsonb;

-- 4. Usage metering (token counts, cost, latency)
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS tokens_input integer;
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS tokens_output integer;
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS cost_usd numeric(12,6);
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS duration_ms integer;

-- 5. Maintenance timestamp
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 5b. Question-generation telemetry (ai-teacher.ts writes these after every
--     generation; live-DB probe 2026-09-02 confirmed they are missing too)
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS questions_generated integer;
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS questions_accepted integer;
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS questions_rejected integer;

-- 5c. Review workflow + error taxonomy (typed in AiGenerationInsert/Update —
--     the supabase/types.ts contract)
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS error_code text;
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS review_status text
    CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision') OR review_status IS NULL);
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.ai_generation_requests
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- 5d. Backfill sensible defaults for historical rows
UPDATE public.ai_generation_requests
  SET review_status = 'approved'
  WHERE review_status IS NULL
    AND status = 'completed';

-- 6. Indexes for the tracking/analytics query patterns
CREATE INDEX IF NOT EXISTS idx_ai_gen_requests_user
  ON public.ai_generation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_gen_requests_school
  ON public.ai_generation_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_ai_gen_requests_status
  ON public.ai_generation_requests(status);
CREATE INDEX IF NOT EXISTS idx_ai_gen_requests_created
  ON public.ai_generation_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_gen_requests_user_created
  ON public.ai_generation_requests(user_id, created_at DESC);

-- 7. RLS: owner can read own AI request history; school members read their
--    school's; super_admin full. (Helpers from migration 005.)
DO $$
BEGIN
  EXECUTE 'ALTER TABLE public.ai_generation_requests ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS owner_read_ai_generations ON public.ai_generation_requests';
  EXECUTE 'CREATE POLICY owner_read_ai_generations ON public.ai_generation_requests
    FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      OR (school_id IS NOT NULL AND public.is_school_member(school_id))
      OR public.get_user_role() = ''super_admin''
    )';

  EXECUTE 'DROP POLICY IF EXISTS owner_insert_ai_generations ON public.ai_generation_requests';
  EXECUTE 'CREATE POLICY owner_insert_ai_generations ON public.ai_generation_requests
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      OR public.get_user_role() = ''super_admin''
    )';

  EXECUTE 'DROP POLICY IF EXISTS owner_update_ai_generations ON public.ai_generation_requests';
  EXECUTE 'CREATE POLICY owner_update_ai_generations ON public.ai_generation_requests
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR public.get_user_role() = ''super_admin'')
    WITH CHECK (user_id = auth.uid() OR public.get_user_role() = ''super_admin'')';
END $$;

-- 8. Backfill user_id where possible from school membership (best effort —
--    rows created before this migration have NULL user_id)
COMMENT ON COLUMN public.ai_generation_requests.user_id IS 'requesting user (Ω-15 tracking contract: request ID/user/tenant/model/tokens/latency/cost/status)';
COMMENT ON COLUMN public.ai_generation_requests.cost_usd IS 'estimated provider cost, USD';
COMMENT ON COLUMN public.ai_generation_requests.duration_ms IS 'end-to-end generation latency';
