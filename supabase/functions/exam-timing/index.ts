// ============================================================================
// ExamForge AI — Server-Authoritative Exam Timing Edge Function
// ============================================================================
// This is the SINGLE SOURCE OF TRUTH for exam timing.
//
// The server determines:
//   - When an exam attempt starts (server timestamp)
//   - How much time remains (server calculation)
//   - Whether a submission is on-time or late
//   - When the exam expires (server-calculated deadline)
//
// The client MUST NOT be trusted for any timing decision.
// The client only displays the countdown and syncs with this endpoint.
//
// Operations:
//   1. start-attempt    — Server records start time, returns deadline
//   2. sync-time        — Client periodically checks remaining time
//   3. submit-attempt   — Server validates timing before accepting
//   4. recover-attempt  — After reconnect/restart, get current state
//
// OFFLINE POLICY:
//   - If a student goes offline during an exam, the server clock
//     continues ticking. When they reconnect, the server tells them
//     the actual remaining time.
//   - If the exam expires while offline, any answers saved before
//     the deadline are accepted. Answers after the deadline are
//     rejected.
//   - For the pilot (2 schools), offline exams are NOT supported.
//     Students must have connectivity. If they lose connection,
//     locally saved answers are preserved but the exam continues
//     counting down on the server. On reconnect, the client syncs.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';
import { validateAuth } from '../_shared/auth.ts';

// ─── Helper: Calculate remaining time server-side ───────────────────────
function calculateRemainingSeconds(startedAt: string, allowedDurationMinutes: number): number {
  const startMs = new Date(startedAt).getTime();
  const nowMs = Date.now();
  const elapsedSeconds = Math.floor((nowMs - startMs) / 1000);
  const totalSeconds = allowedDurationMinutes * 60;
  return Math.max(0, totalSeconds - elapsedSeconds);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: combineHeaders(corsHeaders) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Verify authentication ────────────────────────────────────────────
  const authResult = await validateAuth(req);
  if (authResult.error || !authResult.user) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const user = authResult.user;

  // ─── Rate limiting ────────────────────────────────────────────────────
  const rateLimitResult = checkRateLimit(user.id);
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // ─── Parse request ────────────────────────────────────────────────────
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });
  }

  const operation = body.operation as string;

  try {
    switch (operation) {
      // ═══════════════════════════════════════════════════════════════════
      // START ATTEMPT
      // ═══════════════════════════════════════════════════════════════════
      case 'start-attempt': {
        const { exam_id } = body;
        if (!exam_id) {
          return new Response(JSON.stringify({ error: 'exam_id required' }), {
            status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        // Get exam details
        const { data: exam, error: examError } = await adminClient
          .from('exams')
          .select('id, time_limit_minutes, status, school_id')
          .eq('id', exam_id)
          .maybeSingle();

        if (examError || !exam) {
          return new Response(JSON.stringify({ error: 'Exam not found' }), {
            status: 404, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        if (exam.status !== 'published' && exam.status !== 'active') {
          return new Response(JSON.stringify({ error: 'Exam not available' }), {
            status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        // Check for existing in-progress attempt
        const { data: existingAttempt } = await adminClient
          .from('exam_attempts')
          .select('id, started_at, status')
          .eq('exam_id', exam_id)
          .eq('student_id', user.id)
          .in('status', ['in_progress', 'not_started'])
          .maybeSingle();

        if (existingAttempt && existingAttempt.status === 'in_progress') {
          // Resume existing attempt — return current timing
          const remaining = calculateRemainingSeconds(
            existingAttempt.started_at,
            exam.time_limit_minutes,
          );
          const expiresAt = new Date(
            new Date(existingAttempt.started_at).getTime() + exam.time_limit_minutes * 60000
          ).toISOString();

          return new Response(JSON.stringify({
            attempt_id: existingAttempt.id,
            started_at: existingAttempt.started_at,
            allowed_duration_minutes: exam.time_limit_minutes,
            expires_at: expiresAt,
            remaining_seconds: remaining,
            server_time: new Date().toISOString(),
          }), { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
        }

        // Create new attempt with server-authoritative start time
        const serverNow = new Date().toISOString();
        const expiresAt = new Date(
          new Date(serverNow).getTime() + exam.time_limit_minutes * 60000
        ).toISOString();

        const { data: newAttempt, error: createError } = await adminClient
          .from('exam_attempts')
          .insert({
            exam_id: exam_id,
            student_id: user.id,
            school_id: exam.school_id,
            status: 'in_progress',
            started_at: serverNow,
            allowed_duration_minutes: exam.time_limit_minutes,
            server_expires_at: expiresAt,
          })
          .select('id, started_at')
          .single();

        if (createError) {
          console.error('Failed to create attempt:', createError);
          return new Response(JSON.stringify({ error: 'Failed to start attempt' }), {
            status: 500, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        // Audit log
        await adminClient.from('audit_log').insert({
          user_id: user.id,
          action: 'EXAM_ATTEMPT_STARTED',
          resource_type: 'exam_attempt',
          resource_id: newAttempt.id,
          details: {
            exam_id,
            server_start_time: serverNow,
            allowed_duration_minutes: exam.time_limit_minutes,
            server_expires_at: expiresAt,
          },
        });

        return new Response(JSON.stringify({
          attempt_id: newAttempt.id,
          started_at: serverNow,
          allowed_duration_minutes: exam.time_limit_minutes,
          expires_at: expiresAt,
          remaining_seconds: exam.time_limit_minutes * 60,
          server_time: serverNow,
        }), { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
      }

      // ═══════════════════════════════════════════════════════════════════
      // SYNC TIME (periodic client check)
      // ═══════════════════════════════════════════════════════════════════
      case 'sync-time': {
        const { attempt_id } = body;
        if (!attempt_id) {
          return new Response(JSON.stringify({ error: 'attempt_id required' }), {
            status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        const { data: attempt } = await adminClient
          .from('exam_attempts')
          .select('id, started_at, allowed_duration_minutes, server_expires_at, status, student_id')
          .eq('id', attempt_id)
          .maybeSingle();

        if (!attempt) {
          return new Response(JSON.stringify({ error: 'Attempt not found' }), {
            status: 404, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        // Verify the user owns this attempt
        if (attempt.student_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Not your attempt' }), {
            status: 403, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        const remaining = calculateRemainingSeconds(
          attempt.started_at,
          attempt.allowed_duration_minutes,
        );

        // If time has expired and attempt is still in_progress, auto-submit
        if (remaining <= 0 && attempt.status === 'in_progress') {
          await adminClient
            .from('exam_attempts')
            .update({
              status: 'auto_submitted',
              submission_type: 'timed_out',
              submitted_at: new Date().toISOString(),
            })
            .eq('id', attempt_id);
        }

        return new Response(JSON.stringify({
          attempt_id: attempt.id,
          remaining_seconds: remaining,
          is_expired: remaining <= 0,
          expires_at: attempt.server_expires_at,
          server_time: new Date().toISOString(),
          attempt_status: remaining <= 0 ? 'auto_submitted' : attempt.status,
        }), { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
      }

      // ═══════════════════════════════════════════════════════════════════
      // SUBMIT ATTEMPT
      // ═══════════════════════════════════════════════════════════════════
      case 'submit-attempt': {
        const { attempt_id, submission_type } = body;
        if (!attempt_id) {
          return new Response(JSON.stringify({ error: 'attempt_id required' }), {
            status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        const { data: attempt } = await adminClient
          .from('exam_attempts')
          .select('id, started_at, allowed_duration_minutes, server_expires_at, status, student_id')
          .eq('id', attempt_id)
          .maybeSingle();

        if (!attempt) {
          return new Response(JSON.stringify({ error: 'Attempt not found' }), {
            status: 404, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        // Verify ownership
        if (attempt.student_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Not your attempt' }), {
            status: 403, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        // Check for duplicate submission
        if (attempt.status !== 'in_progress') {
          return new Response(JSON.stringify({
            error: 'Attempt already submitted',
            status: attempt.status,
          }), { status: 409, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
        }

        const remaining = calculateRemainingSeconds(
          attempt.started_at,
          attempt.allowed_duration_minutes,
        );

        const isOnTime = remaining > 0;
        const effectiveSubmissionType = isOnTime
          ? (submission_type || 'manual')
          : 'timed_out';

        // Update the attempt
        const { error: updateError } = await adminClient
          .from('exam_attempts')
          .update({
            status: isOnTime ? 'submitted' : 'auto_submitted',
            submission_type: effectiveSubmissionType,
            submitted_at: new Date().toISOString(),
            server_remaining_at_submit: remaining,
          })
          .eq('id', attempt_id);

        if (updateError) {
          console.error('Failed to update attempt:', updateError);
          return new Response(JSON.stringify({ error: 'Failed to submit' }), {
            status: 500, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        // Audit log
        await adminClient.from('audit_log').insert({
          user_id: user.id,
          action: isOnTime ? 'EXAM_ATTEMPT_SUBMITTED' : 'EXAM_ATTEMPT_LATE_SUBMIT',
          resource_type: 'exam_attempt',
          resource_id: attempt_id,
          details: {
            remaining_seconds: remaining,
            is_on_time: isOnTime,
            submission_type: effectiveSubmissionType,
            server_time: new Date().toISOString(),
          },
        });

        return new Response(JSON.stringify({
          attempt_id,
          accepted: isOnTime,
          remaining_seconds: remaining,
          submission_type: effectiveSubmissionType,
          server_time: new Date().toISOString(),
        }), { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
      }

      // ═══════════════════════════════════════════════════════════════════
      // RECOVER ATTEMPT (after reconnect / app restart)
      // ═══════════════════════════════════════════════════════════════════
      case 'recover-attempt': {
        const { attempt_id } = body;
        if (!attempt_id) {
          return new Response(JSON.stringify({ error: 'attempt_id required' }), {
            status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        const { data: attempt } = await adminClient
          .from('exam_attempts')
          .select('id, exam_id, started_at, allowed_duration_minutes, server_expires_at, status, student_id')
          .eq('id', attempt_id)
          .maybeSingle();

        if (!attempt) {
          return new Response(JSON.stringify({ error: 'Attempt not found' }), {
            status: 404, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        if (attempt.student_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Not your attempt' }), {
            status: 403, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
          });
        }

        const remaining = calculateRemainingSeconds(
          attempt.started_at,
          attempt.allowed_duration_minutes,
        );

        return new Response(JSON.stringify({
          attempt_id: attempt.id,
          exam_id: attempt.exam_id,
          status: attempt.status,
          started_at: attempt.started_at,
          allowed_duration_minutes: attempt.allowed_duration_minutes,
          expires_at: attempt.server_expires_at,
          remaining_seconds: remaining,
          is_expired: remaining <= 0,
          server_time: new Date().toISOString(),
          // Tell the client whether to resume or show results
          action: remaining > 0 && attempt.status === 'in_progress' ? 'resume' : 'results',
        }), { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${operation}` }),
          { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
        );
    }
  } catch (err) {
    console.error(`Exam timing error: ${err}`);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
    );
  }
});
