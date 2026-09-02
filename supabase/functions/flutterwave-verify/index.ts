// ============================================================================
// ExamForge AI — Flutterwave Transaction Verification Edge Function
// ============================================================================
// Verifies a Flutterwave transaction server-side.
//
// WHY THIS EXISTS:
//   The Flutter client previously verified transactions client-side, which
//   is insecure because:
//     1. The client can skip verification or tamper with the result
//     2. Amount/currency validation was done in the client (bypassable)
//     3. Transaction status updates were client-initiated
//
// SECURITY MODEL:
//   1. Requires authenticated user (JWT validation via shared auth)
//   2. Rate limiting per user to prevent abuse
//   3. Security headers on all responses
//   4. Amount and currency are validated server-side against expected values
//   5. Transaction ownership is verified (user can only verify their own tx)
//   6. Integrity hash is checked to detect amount tampering
//   7. Constant-time comparison for sensitive values
//   8. Only updates status if Flutterwave confirms success
//   9. 30s timeout on Flutterwave API calls
//  10. Audit logging for all verification outcomes
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';
import { validateAuth, hasRole, isSuperAdmin, isAdmin } from '../_shared/auth.ts';

// ─── Constant-time string comparison ──────────────────────────────────────
function constantTimeEquals(a: string, b: string): boolean {
  const lengthsMatch = a.length === b.length;
  const maxLen = Math.max(a.length, b.length);
  let accumulator = 0;
  for (let i = 0; i < maxLen; i++) {
    const aByte = i < a.length ? a.charCodeAt(i) : 0xFF;
    const bByte = i < b.length ? b.charCodeAt(i) : 0xFF;
    accumulator |= aByte ^ bByte;
  }
  return accumulator === 0 && lengthsMatch;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // ─── CORS preflight ──────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: combineHeaders(corsHeaders) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Step 1: Authenticate via shared auth ────────────────────────────
  const authResult = await validateAuth(req);
  if (authResult.error || !authResult.user) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const user = authResult.user;

  // ─── Step 2: Rate limiting ──────────────────────────────────────────
  const rateLimit = checkRateLimit(user.id);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
      status: 429,
      headers: combineHeaders(corsHeaders, getRateLimitHeaders(rateLimit), { 'Content-Type': 'application/json' }),
    });
  }

  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  // ─── Step 3: Validate environment & create admin client ──────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');

  if (!flutterwaveSecretKey) {
    console.error('FLUTTERWAVE_SECRET_KEY not configured');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // ─── Step 4: Parse and validate request ──────────────────────────────
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const { txRef, expectedAmount, expectedCurrency } = body;

  if (!txRef) {
    return new Response(JSON.stringify({ error: 'Missing required field: txRef' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Step 5: Look up local transaction ───────────────────────────────
  const { data: localTx, error: txError } = await adminClient
    .from('transactions')
    .select('id, user_id, amount, currency, status, amount_integrity_hash, flutterwave_transaction_id')
    .eq('flutterwave_tx_ref', txRef)
    .maybeSingle();

  if (txError || !localTx) {
    return new Response(JSON.stringify({ error: 'Transaction not found' }), {
      status: 404,
      headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Step 6: Verify ownership ────────────────────────────────────────
  // The authenticated user must own this transaction.
  if (!constantTimeEquals(localTx.user_id, user.id)) {
    console.error(`Ownership mismatch: user ${user.id} tried to verify tx owned by ${localTx.user_id}`);
    // Audit log: ownership violation
    await adminClient.from('audit_log').insert({
      user_id: user.id,
      action: 'flutterwave_verify_ownership_mismatch',
      resource_type: 'transaction',
      resource_id: localTx.id,
      details: { tx_ref: txRef, tx_owner: localTx.user_id },
    }).catch(() => {}); // Non-blocking

    return new Response(JSON.stringify({ error: 'Forbidden — transaction does not belong to you' }), {
      status: 403,
      headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // Already verified? Return current status.
  if (localTx.status === 'successful') {
    return new Response(
      JSON.stringify({
        status: 'successful',
        message: 'Transaction already verified',
        transactionId: localTx.id,
        amount: localTx.amount,
        currency: localTx.currency,
      }),
      { status: 200, headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }) }
    );
  }

  // ─── Step 7: Call Flutterwave verify API with 30s timeout ───────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const flwResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/verify_by_reference/${encodeURIComponent(txRef)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${flutterwaveSecretKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    const flwData = await flwResponse.json();

    if (flwData.status !== 'success') {
      // Audit log: Flutterwave verification failure
      await adminClient.from('audit_log').insert({
        user_id: user.id,
        action: 'flutterwave_verify_gateway_failure',
        resource_type: 'transaction',
        resource_id: localTx.id,
        details: { tx_ref: txRef, flw_message: flwData.message },
      }).catch(() => {}); // Non-blocking

      return new Response(
        JSON.stringify({
          error: 'Verification failed at payment gateway',
          details: flwData.message || 'Unknown error from Flutterwave',
        }),
        { status: 502, headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }) }
      );
    }

    const txData = flwData.data || {};

    // ─── Step 8: Validate amount server-side ───────────────────────────
    // Use the expected amount from the request body OR the DB record
    const serverExpectedAmount = expectedAmount
      ? parseFloat(expectedAmount)
      : parseFloat(localTx.amount);

    const chargedAmount = parseFloat(txData.charged_amount) || 0;
    const tolerance = 1.0; // Allow 1 unit tolerance for rounding

    if (isNaN(serverExpectedAmount) || serverExpectedAmount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid expected amount' }), {
        status: 400,
        headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }),
      });
    }

    if (Math.abs(chargedAmount - serverExpectedAmount) > tolerance) {
      console.error(
        `FRAUD ALERT: Amount mismatch for txRef=${txRef}. Expected=${serverExpectedAmount}, Charged=${chargedAmount}`
      );

      // Mark transaction as disputed
      await adminClient
        .from('transactions')
        .update({
          status: 'disputed',
          processor_response: txData,
          verified_at: new Date().toISOString(),
        })
        .eq('id', localTx.id);

      // Audit log: amount mismatch fraud
      await adminClient.from('audit_log').insert({
        user_id: user.id,
        action: 'flutterwave_verify_amount_mismatch',
        resource_type: 'transaction',
        resource_id: localTx.id,
        details: { tx_ref: txRef, expected_amount: serverExpectedAmount, charged_amount: chargedAmount },
      }).catch(() => {}); // Non-blocking

      return new Response(
        JSON.stringify({
          error: 'Amount mismatch — possible tampering detected',
          expectedAmount: serverExpectedAmount,
          chargedAmount,
        }),
        { status: 400, headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }) }
      );
    }

    // ─── Step 9: Validate currency server-side ─────────────────────────
    const serverExpectedCurrency = (expectedCurrency || localTx.currency || 'NGN').toUpperCase();
    const actualCurrency = (txData.currency || '').toUpperCase();

    if (!constantTimeEquals(actualCurrency, serverExpectedCurrency)) {
      console.error(
        `FRAUD ALERT: Currency mismatch for txRef=${txRef}. Expected=${serverExpectedCurrency}, Actual=${actualCurrency}`
      );

      await adminClient
        .from('transactions')
        .update({
          status: 'disputed',
          processor_response: txData,
          verified_at: new Date().toISOString(),
        })
        .eq('id', localTx.id);

      // Audit log: currency mismatch fraud
      await adminClient.from('audit_log').insert({
        user_id: user.id,
        action: 'flutterwave_verify_currency_mismatch',
        resource_type: 'transaction',
        resource_id: localTx.id,
        details: { tx_ref: txRef, expected_currency: serverExpectedCurrency, actual_currency: actualCurrency },
      }).catch(() => {}); // Non-blocking

      return new Response(
        JSON.stringify({
          error: 'Currency mismatch — possible tampering detected',
          expectedCurrency: serverExpectedCurrency,
          actualCurrency,
        }),
        { status: 400, headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }) }
      );
    }

    // ─── Step 10: Verify integrity hash ─────────────────────────────────
    if (localTx.amount_integrity_hash) {
      const { data: hashValid } = await adminClient.rpc('verify_transaction_integrity', {
        p_tx_ref: txRef,
        p_amount: localTx.amount,
        p_currency: localTx.currency,
        p_stored_hash: localTx.amount_integrity_hash,
      });

      if (!hashValid) {
        console.error(`FRAUD ALERT: Integrity hash mismatch for txRef=${txRef}. Possible tampering!`);
        await adminClient
          .from('transactions')
          .update({
            status: 'disputed',
            processor_response: txData,
            verified_at: new Date().toISOString(),
          })
          .eq('id', localTx.id);

        // Audit log: integrity hash failure
        await adminClient.from('audit_log').insert({
          user_id: user.id,
          action: 'flutterwave_verify_integrity_hash_mismatch',
          resource_type: 'transaction',
          resource_id: localTx.id,
          details: { tx_ref: txRef },
        }).catch(() => {}); // Non-blocking

        return new Response(
          JSON.stringify({ error: 'Integrity check failed — possible tampering detected' }),
          { status: 400, headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }) }
        );
      }
    }

    // ─── Step 11: Update transaction status ─────────────────────────────
    const flwStatus = (txData.status || '').toLowerCase();
    const mappedStatus =
      flwStatus === 'successful'
        ? 'successful'
        : flwStatus === 'failed'
        ? 'failed'
        : 'pending';

    const flwTxId = txData.id?.toString();

    const updateData: Record<string, any> = {
      status: mappedStatus,
      flutterwave_transaction_id: flwTxId,
      flutterwave_flw_ref: txData.flw_ref,
      flutterwave_fee: parseFloat(txData.app_fee) || 0,
      net_amount: parseFloat(txData.amount_settled) || 0,
      payment_method_summary: txData.payment_type,
      processor_response: txData,
      verified_at: new Date().toISOString(),
    };

    if (mappedStatus === 'successful') {
      updateData.completed_at = new Date().toISOString();
    }

    await adminClient.from('transactions').update(updateData).eq('id', localTx.id);

    // Audit log: successful verification
    await adminClient.from('audit_log').insert({
      user_id: user.id,
      action: 'flutterwave_verify_success',
      resource_type: 'transaction',
      resource_id: localTx.id,
      details: {
        tx_ref: txRef,
        flw_transaction_id: flwTxId,
        status: mappedStatus,
        amount: chargedAmount,
        currency: actualCurrency,
        payment_method: txData.payment_type,
      },
    }).catch(() => {}); // Non-blocking

    clearTimeout(timeoutId);

    // ─── Step 12: Return verification result ───────────────────────────
    return new Response(
      JSON.stringify({
        status: mappedStatus,
        transactionId: localTx.id,
        txRef: txRef,
        amount: chargedAmount,
        currency: actualCurrency,
        flwTransactionId: flwTxId,
        paymentMethod: txData.payment_type,
      }),
      { status: 200, headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }) }
    );
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';

    // Audit log: verification failure (timeout or network error)
    await adminClient.from('audit_log').insert({
      user_id: user.id,
      action: isTimeout ? 'flutterwave_verify_timeout' : 'flutterwave_verify_network_error',
      resource_type: 'transaction',
      resource_id: localTx.id,
      details: { tx_ref: txRef, error: errorMessage },
    }).catch(() => {}); // Non-blocking

    return new Response(
      JSON.stringify({
        error: isTimeout
          ? 'Verification timed out. Please retry.'
          : 'Verification failed due to network error',
      }),
      { status: 502, headers: combineHeaders(corsHeaders, rateLimitHeaders, { 'Content-Type': 'application/json' }) }
    );
  }
});
