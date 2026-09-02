// ============================================================================
// ExamForge AI — Flutterwave Transaction Fee Query Edge Function
// ============================================================================
// Returns the transaction fee for a given amount and currency.
// Must be server-side because it requires the Flutterwave secret key.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';
import { validateAuth } from '../_shared/auth.ts';

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

  // ── Shared auth validation ──────────────────────────────────────────────
  const authResult = await validateAuth(req);
  if (authResult.error || !authResult.user) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const user = authResult.user;

  // ── Rate limiting ───────────────────────────────────────────────────────
  const rateLimitResult = checkRateLimit(user.id);
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: combineHeaders(
        corsHeaders,
        { 'Content-Type': 'application/json', ...getRateLimitHeaders(rateLimitResult) },
      ),
    });
  }

  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

  const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');

  if (!flutterwaveSecretKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });
  }

  const { amount, currency } = body;
  if (!amount || !currency) {
    return new Response(JSON.stringify({ error: 'Missing required fields: amount, currency' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return new Response(JSON.stringify({ error: 'Amount must be a positive number' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });
  }

  const normalizedCurrency = currency.toUpperCase();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const flwResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/fee?amount=${parsedAmount}&currency=${normalizedCurrency}`,
      { method: 'GET', headers: { 'Authorization': `Bearer ${flutterwaveSecretKey}`, 'Content-Type': 'application/json' }, signal: controller.signal },
    );

    const flwData = await flwResponse.json();
    clearTimeout(timeoutId);

    if (flwData.status !== 'success') {
      // Audit log — fee query failed
      try {
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        await adminClient.from('audit_log').insert({
          user_id: user.id,
          action: 'FEE_QUERY_FAILED',
          resource_type: 'transaction_fee',
          resource_id: null,
          metadata: { amount: parsedAmount, currency: normalizedCurrency, flw_message: flwData.message },
        });
      } catch { /* non-blocking */ }

      return new Response(JSON.stringify({ error: 'Failed to get transaction fee', details: flwData.message }), {
        status: 502,
        headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
      });
    }

    // Audit log — fee query success
    try {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await adminClient.from('audit_log').insert({
        user_id: user.id,
        action: 'FEE_QUERY_SUCCESS',
        resource_type: 'transaction_fee',
        resource_id: null,
        metadata: { amount: parsedAmount, currency: normalizedCurrency, fee: flwData.data?.fee },
      });
    } catch { /* non-blocking */ }

    return new Response(JSON.stringify({
      fee: flwData.data?.fee,
      currency: flwData.data?.currency,
      chargeAmount: flwData.data?.charge_amount,
    }), {
      status: 200,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';

    // Audit log — fee query error
    try {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      await adminClient.from('audit_log').insert({
        user_id: user.id,
        action: 'FEE_QUERY_ERROR',
        resource_type: 'transaction_fee',
        resource_id: null,
        metadata: { amount: parsedAmount, currency: normalizedCurrency, error: isTimeout ? 'timeout' : 'fetch_failed' },
      });
    } catch { /* non-blocking */ }

    return new Response(JSON.stringify({ error: isTimeout ? 'Fee query timed out' : 'Fee query failed' }), {
      status: 502,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });
  }
});
