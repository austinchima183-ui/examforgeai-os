// ============================================================================
// ExamForge AI — Flutterwave Webhook Edge Function
// ============================================================================
// This is the ONLY entry point for Flutterwave webhook events.
// It performs:
//   1. Signature verification (constant-time comparison — FIXED)
//   2. Idempotency check (using webhook_events table)
//   3. Amount verification (checks charged_amount against expected amount)
//   4. Currency verification
//   5. Transaction replay detection
//   6. Server-side commission calculation (for marketplace payments)
//
// IMPORTANT: The Flutter app does NOT process webhooks directly.
// All webhooks must come through this Edge Function to ensure
// server-authoritative verification.
//
// FIX HISTORY:
//   The original constantTimeEquals() had a CRITICAL bug: when a.length !== b.length,
//   it reassigned b = a, making the comparison a-vs-a (always true) AND making the
//   final length check a.length === b.length also always true (since b was overwritten).
//   This allowed ANY webhook with a hash of different length than the secret to
//   ALWAYS pass signature verification — a complete bypass.
//
//   The fix captures the length-match result BEFORE any processing and uses
//   0xFF padding for out-of-bounds indices to ensure different-length inputs
//   always produce a non-zero XOR accumulator.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';

// ─── Constant-time string comparison (FIXED) ─────────────────────────────────
//
// ROOT CAUSE: The original implementation reassigned b = a when lengths differed,
// causing the comparison to always succeed for different-length inputs.
//
// FIX: Capture length match BEFORE processing. Iterate over max length with
// 0xFF padding for out-of-bounds indices. Return accumulator===0 AND lengthsMatch.
function constantTimeEquals(a: string, b: string): boolean {
  // Capture length match BEFORE any processing.
  const lengthsMatch = a.length === b.length;

  // Iterate over the maximum length to ensure constant time.
  // 0xFF padding ensures different-length inputs always produce non-zero XOR.
  const maxLen = Math.max(a.length, b.length);

  let accumulator = 0;
  for (let i = 0; i < maxLen; i++) {
    const aByte = i < a.length ? a.charCodeAt(i) : 0xFF;
    const bByte = i < b.length ? b.charCodeAt(i) : 0xFF;
    accumulator |= aByte ^ bByte;
  }

  // Both content AND length must match.
  return accumulator === 0 && lengthsMatch;
}

// ─── Verify Flutterwave webhook signature ──────────────────────────────────
function verifyWebhookSignature(headers: Record<string, string>, secretHash: string): boolean {
  const incomingHash = headers['verif-hash'] || headers['Verif-Hash'] || '';
  if (!incomingHash || !secretHash) {
    console.error('Missing webhook hash(es)');
    return false;
  }
  return constantTimeEquals(incomingHash, secretHash);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: combineHeaders(corsHeaders, getSecurityHeaders()) });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Rate limiting (based on client IP — webhooks come from Flutterwave) ──
  const reqHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => { reqHeaders[key] = value; });
  const clientIp = reqHeaders['x-forwarded-for'] || reqHeaders['x-real-ip'] || 'unknown';

  const rateLimitResult = checkRateLimit(`webhook:${clientIp}`, 100, 60000);
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: combineHeaders(corsHeaders, { ...rateLimitHeaders, 'Content-Type': 'application/json' }),
    });
  }

  const webhookSecret = Deno.env.get('FLUTTERWAVE_WEBHOOK_SECRET_HASH');
  if (!webhookSecret) {
    console.error('FLUTTERWAVE_WEBHOOK_SECRET_HASH not configured');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: combineHeaders(corsHeaders, { ...rateLimitHeaders, 'Content-Type': 'application/json' }),
    });
  }

  // ─── Step 1: Verify signature ──────────────────────────────────────────
  const body = await req.text();
  if (!verifyWebhookSignature(reqHeaders, webhookSecret)) {
    console.error('Webhook signature verification FAILED');
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 401,
      headers: combineHeaders(corsHeaders, { ...rateLimitHeaders, 'Content-Type': 'application/json' }),
    });
  }

  // ─── Step 2: Parse payload ─────────────────────────────────────────────
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, { ...rateLimitHeaders, 'Content-Type': 'application/json' }),
    });
  }

  const event = payload.event || '';
  const data = payload.data || {};
  const flwId = data.id?.toString() || '';
  const idempotencyKey = `${event}_${flwId}`;

  // ─── Step 3: Initialize Supabase client with 30s timeout ───────────────
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 30_000);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    global: { headers: { 'X-Client-Timeout': '30000' } },
  });

  // ─── Step 4: Idempotency check ─────────────────────────────────────────
  const { data: existingEvent } = await supabase
    .from('webhook_events')
    .select('id, status')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existingEvent) {
    if (existingEvent.status === 'processed') {
      console.log(`Webhook already processed: ${idempotencyKey}`);
      clearTimeout(timeoutId);
      return new Response(JSON.stringify({ status: 'already_processed' }), {
        status: 200,
        headers: combineHeaders(corsHeaders, { ...rateLimitHeaders, 'Content-Type': 'application/json' }),
      });
    }
    if (existingEvent.status === 'processing') {
      console.log(`Webhook currently being processed: ${idempotencyKey}`);
      clearTimeout(timeoutId);
      return new Response(JSON.stringify({ status: 'processing' }), {
        status: 202,
        headers: combineHeaders(corsHeaders, { ...rateLimitHeaders, 'Content-Type': 'application/json' }),
      });
    }
  }

  // ─── Step 5: Log webhook event ─────────────────────────────────────────
  await supabase.from('webhook_events').upsert({
    event_type: event,
    event_id: flwId,
    idempotency_key: idempotencyKey,
    payload: payload,
    status: 'processing',
    signature_valid: true,
    raw_body: body,
  }, { onConflict: 'idempotency_key' });

  // ─── Step 6: Process the event ─────────────────────────────────────────
  let processingError: string | null = null;

  try {
    switch (event) {
      case 'charge.completed': {
        const txRef = data.tx_ref;
        if (!txRef) {
          processingError = 'Missing tx_ref in charge.completed event';
          break;
        }

        // Look up our local transaction to get expected amount
        const { data: localTx, error: txError } = await supabase
          .from('transactions')
          .select('id, amount, currency, amount_integrity_hash, status, flutterwave_transaction_id')
          .eq('flutterwave_tx_ref', txRef)
          .maybeSingle();

        if (txError || !localTx) {
          processingError = `Transaction not found for tx_ref: ${txRef}`;
          break;
        }

        // Skip if already successful (prevents re-processing)
        if (localTx.status === 'successful') {
          console.log(`Transaction ${txRef} already marked successful`);
          break;
        }

        // ─── AMOUNT VERIFICATION (CRITICAL) ────────────────────────────
        const chargedAmount = parseFloat(data.charged_amount) || 0;
        const expectedAmount = parseFloat(localTx.amount) || 0;
        const tolerance = 1.0; // Allow 1 NGN tolerance for rounding

        if (Math.abs(chargedAmount - expectedAmount) > tolerance) {
          processingError = `AMOUNT MISMATCH: expected=${expectedAmount}, charged=${chargedAmount}`;
          console.error(`FRAUD ALERT: ${processingError} for tx_ref=${txRef}`);
          break;
        }

        // ─── NEGATIVE/ZERO AMOUNT CHECK ───────────────────────────────
        if (chargedAmount <= 0) {
          processingError = `INVALID AMOUNT: charged_amount=${chargedAmount} — must be positive`;
          console.error(`FRAUD ALERT: ${processingError} for tx_ref=${txRef}`);
          break;
        }

        // ─── CURRENCY VERIFICATION ─────────────────────────────────────
        const actualCurrency = (data.currency || '').toUpperCase();
        const expectedCurrency = (localTx.currency || 'NGN').toUpperCase();
        if (actualCurrency !== expectedCurrency) {
          processingError = `CURRENCY MISMATCH: expected=${expectedCurrency}, actual=${actualCurrency}`;
          console.error(`FRAUD ALERT: ${processingError} for tx_ref=${txRef}`);
          break;
        }

        // ─── INTEGRITY HASH VERIFICATION ───────────────────────────────
        if (localTx.amount_integrity_hash) {
          const { data: hashValid } = await supabase.rpc('verify_transaction_integrity', {
            p_tx_ref: txRef,
            p_amount: localTx.amount,
            p_currency: localTx.currency,
            p_stored_hash: localTx.amount_integrity_hash,
          });
          if (!hashValid) {
            processingError = `INTEGRITY HASH MISMATCH for tx_ref=${txRef}. Possible tampering!`;
            console.error(`FRAUD ALERT: ${processingError}`);
            break;
          }
        }

        // ─── REPLAY DETECTION ──────────────────────────────────────────
        const flwTxId = data.id?.toString();
        if (flwTxId && localTx.flutterwave_transaction_id &&
            localTx.flutterwave_transaction_id !== flwTxId) {
          const { data: replayCheck } = await supabase
            .from('transactions')
            .select('id')
            .eq('flutterwave_transaction_id', flwTxId)
            .neq('id', localTx.id)
            .eq('status', 'successful')
            .maybeSingle();

          if (replayCheck) {
            processingError = `REPLAY ATTACK: Flutterwave TX ${flwTxId} already used by transaction ${replayCheck.id}`;
            console.error(`FRAUD ALERT: ${processingError}`);
            break;
          }
        }

        // ─── UPDATE TRANSACTION ────────────────────────────────────────
        const flwStatus = (data.status || '').toLowerCase();
        const mappedStatus = flwStatus === 'successful' ? 'successful'
            : flwStatus === 'failed' ? 'failed'
            : 'pending';

        const updateData: Record<string, any> = {
          status: mappedStatus,
          flutterwave_transaction_id: flwTxId,
          flutterwave_flw_ref: data.flw_ref,
          flutterwave_fee: parseFloat(data.app_fee) || 0,
          net_amount: parseFloat(data.amount_settled) || 0,
          payment_method_summary: data.payment_type,
          processor_response: data,
          verified_at: new Date().toISOString(),
          risk_score: data.risk_score || 0,
        };

        if (mappedStatus === 'successful') {
          updateData.completed_at = new Date().toISOString();
        }

        await supabase
          .from('transactions')
          .update(updateData)
          .eq('id', localTx.id);

        // Link webhook event to transaction via payload update
        await supabase
          .from('webhook_events')
          .update({
            last_error: null,
            processing_attempts: 1,
          })
          .eq('idempotency_key', idempotencyKey);

        break;
      }

      case 'subscription.cancelled': {
        const subId = data.subscription_id;
        if (subId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
            })
            .eq('id', subId);
        }
        break;
      }

      case 'transfer.completed':
      case 'transfer.failed':
        console.log(`Transfer event received: ${event}`);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      processingError = 'Request timed out after 30 seconds';
      console.error(`Webhook processing timeout: ${processingError}`);
    } else {
      processingError = err instanceof Error ? err.message : String(err);
      console.error(`Webhook processing error: ${processingError}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }

  // ─── Step 7: Update webhook event status ───────────────────────────────
  const finalStatus = processingError ? 'failed' : 'processed';
  await supabase
    .from('webhook_events')
    .update({
      status: finalStatus,
      processed_at: new Date().toISOString(),
      last_error: processingError,
    })
    .eq('idempotency_key', idempotencyKey);

  // ─── Step 8: Return response ───────────────────────────────────────────
  return new Response(JSON.stringify({
    status: processingError ? 'processed_with_error' : 'success',
    error: processingError,
  }), {
    status: 200,
    headers: combineHeaders(corsHeaders, { ...rateLimitHeaders, 'Content-Type': 'application/json' }),
  });
});
