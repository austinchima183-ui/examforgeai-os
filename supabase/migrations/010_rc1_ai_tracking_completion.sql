-- ============================================================================
-- ExamForge AI — Migration 010: AI Tracking Contract Completion (RC1)
-- ============================================================================
-- The live ai_generation_requests table predates migration 008's columns and
-- enforces NOT NULL on its ORIGINAL columns: requested_by (uuid), model_name
-- (text), generation_type (prompt_type enum), input_params (jsonb).
-- The engine's tracking inserts only populated the migration-008 columns
-- (user_id, model, prompt_text, ...) — every insert violated the NOT NULL
-- constraints and failed SILENTLY (console.warn + continue), so AI tracking
-- never wrote a single row to the live database.
--
-- This migration extends the prompt_type enum with the two flow types the
-- engine uses that the original enum lacks. The companion code change aligns
-- the inserts to populate ALL NOT NULL columns.
-- ============================================================================

ALTER TYPE public.prompt_type ADD VALUE IF NOT EXISTS 'lesson_plan';
ALTER TYPE public.prompt_type ADD VALUE IF NOT EXISTS 'chat_completion';

-- ============================================================================
-- Part 2 — Trigger security + column contract
-- ============================================================================
-- trg_update_usage_stats_on_completion runs as the CALLING user by default.
-- When a teacher/student transitions a generation to completed/failed, the
-- trigger's INSERT INTO ai_usage_stats is RLS-blocked (no INSERT policy for
-- ordinary roles) → the WHOLE status update fails with 42501 and the row
-- stays 'processing' forever. SECURITY DEFINER (owner context, same pattern
-- as migration 005's helpers) is the correct privilege for a system-maintained
-- rollup table. Same hardening for the template-metrics trigger.
ALTER FUNCTION public.trg_update_usage_stats_on_completion() SECURITY DEFINER;
ALTER FUNCTION public.trg_update_usage_stats_on_completion() SET search_path = public;
ALTER FUNCTION public.trg_update_prompt_template_metrics() SECURITY DEFINER;
ALTER FUNCTION public.trg_update_prompt_template_metrics() SET search_path = public;

-- ============================================================================
-- Part 3 — Edge-function request log table
-- ============================================================================
-- supabase/functions/ai-complete writes an audit row per request via the
-- service-role client, but the table never existed on the live database —
-- every insert failed silently (console.error only). RLS stays enabled with
-- no policies: only the service role writes/reads it (deny-by-default).
CREATE TABLE IF NOT EXISTS public.ai_request_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  provider      text NOT NULL,
  model         text,
  prompt_length integer,
  max_tokens    integer,
  temperature   double precision,
  usage         jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_user ON public.ai_request_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_created ON public.ai_request_log(created_at);
ALTER TABLE public.ai_request_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_request_log TO authenticated;
