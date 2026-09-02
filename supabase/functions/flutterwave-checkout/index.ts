// ============================================================================
// ExamForge AI — Flutterwave Checkout Session Edge Function
// ============================================================================
// Initializes a Flutterwave checkout session server-side.
//
// WHY THIS EXISTS:
//   The Flutter client previously called the Flutterwave API directly to
//   initialize payment sessions, exposing the secret key in the process.
//   Moving this to an Edge Function ensures:
//     1. FLUTTERWAVE_SECRET_KEY never reaches the client
//     2. Transaction is recorded in the DB before the user pays
//     3. amount_integrity_hash is generated server-side (tamper-proof)
//     4. Only authenticated users can initiate payments
//
// SECURITY MODEL:
//   1. Requires authenticated user (JWT validation via shared auth)
//   2. Rate limiting: 20 requests per minute per user
//   3. Security headers on all responses
//   4. Amount and currency are validated server-side
//   5. Transaction is recorded with an integrity hash
//   6. All operations are audit-logged
//   7. 30-second timeout on external API calls
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validateAuth, isSuperAdmin, isAdmin } from '../_shared/auth.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';

// ─── Constant-time string comparison ──────────────────────────────────────
// Prevents timing attacks when comparing sensitive values.
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

// ─── Generate amount integrity hash ──────────────────────────────────────
async function generateIntegrityHash(
  amount: string,
  currency: string,
  txRef: string,
  secret: string
): Promise<string> {
  const payload = `${amount}|${currency}|${txRef}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'KES', 'GHS', 'ZAR'];
const MAX_AMOUNT = 10_000_000;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const securityHeaders = getSecurityHeaders();

  // ─── CORS preflight ──────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...corsHeaders, ...securityHeaders } });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Step 1: Authenticate ────────────────────────────────────────────
  const authResult = await validateAuth(req);
  if (!authResult.user) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const user = authResult.user;

  // ─── Step 2: Rate limit check ────────────────────────────────────────
  const rateLimit = checkRateLimit(`checkout:${user.id}`);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) }),
      {
        status: 429,
        headers: combineHeaders(corsHeaders, {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          ...getRateLimitHeaders(rateLimit),
        }),
      }
    );
  }

  // ─── Step 3: Verify Flutterwave secret key ──────────────────────────
  const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
  if (!flutterwaveSecretKey) {
    console.error('FLUTTERWAVE_SECRET_KEY not configured');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // ─── Step 4: Parse and validate request ──────────────────────────────
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const { amount, currency, email, txRef, meta } = body;

  if (!amount || !currency || !email || !txRef) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: amount, currency, email, txRef' }),
      { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return new Response(JSON.stringify({ error: 'Amount must be a positive number' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  if (parsedAmount > MAX_AMOUNT) {
    return new Response(JSON.stringify({ error: `Amount exceeds maximum allowed (${MAX_AMOUNT.toLocaleString()})` }), {
      status: 400,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const normalizedCurrency = currency.toUpperCase();
  if (!SUPPORTED_CURRENCIES.includes(normalizedCurrency)) {
    return new Response(
      JSON.stringify({ error: `Unsupported currency: ${currency}. Supported: ${SUPPORTED_CURRENCIES.join(', ')}` }),
      { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email format' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Step 5: Generate amount integrity hash ──────────────────────────
  const integrityHashSecret = Deno.env.get('FLUTTERWAVE_WEBHOOK_SECRET_HASH') || flutterwaveSecretKey;
  const amountIntegrityHash = await generateIntegrityHash(
    parsedAmount.toString(),
    normalizedCurrency,
    txRef,
    integrityHashSecret
  );

  // ─── Step 6: Record transaction in database BEFORE calling Flutterwave ─
  const { data: transaction, error: txError } = await adminClient
    .from('transactions')
    .insert({
      user_id: user.id,
      amount: parsedAmount,
      currency: normalizedCurrency,
      flutterwave_tx_ref: txRef,
      amount_integrity_hash: amountIntegrityHash,
      status: 'pending',
      metadata: meta || {},
      email: email,
    })
    .select('id')
    .single();

  if (txError || !transaction) {
    console.error('Failed to record transaction:', txError);
    return new Response(JSON.stringify({ error: 'Failed to initialize transaction' }), {
      status: 500,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Step 7: Call Flutterwave API to initialize checkout ─────────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const flwResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${flutterwaveSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: parsedAmount,
        currency: normalizedCurrency,
        redirect_url: `${Deno.env.get('APP_URL') || 'https://app.examforge.ai'}/payment/callback`,
        customer: { email },
        customizations: {
          title: 'ExamForge AI',
          logo: 'https://examforge.ai/logo.png',
        },
        meta: {
          ...(meta || {}),
          user_id: user.id,
          transaction_id: transaction.id,
        },
      }),
      signal: controller.signal,
    });

    const flwData = await flwResponse.json();
    clearTimeout(timeoutId);

    if (flwData.status !== 'success' || !flwData.data?.link) {
      await adminClient
        .from('transactions')
        .update({ status: 'failed', processor_response: flwData })
        .eq('id', transaction.id);

      // Audit log
      await adminClient.from('audit_log').insert({
        user_id: user.id,
        action: 'CHECKOUT_FAILED',
        resource_type: 'transaction',
        resource_id: transaction.id,
        details: { tx_ref: txRef, flutterwave_message: flwData.message },
      });

      return new Response(
        JSON.stringify({ error: 'Failed to initialize checkout session', details: flwData.message || 'Unknown error from Flutterwave' }),
        { status: 502, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
      );
    }

    // Audit log — success
    await adminClient.from('audit_log').insert({
      user_id: user.id,
      action: 'CHECKOUT_INITIALIZED',
      resource_type: 'transaction',
      resource_id: transaction.id,
      details: { tx_ref: txRef, amount: parsedAmount, currency: normalizedCurrency },
    });

    return new Response(
      JSON.stringify({ checkoutUrl: flwData.data.link, txRef, transactionId: transaction.id }),
      { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMessage = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';

    await adminClient
      .from('transactions')
      .update({ status: 'failed', processor_response: { error: errorMessage } })
      .eq('id', transaction.id);

    // Audit log — failure
    await adminClient.from('audit_log').insert({
      user_id: user.id,
      action: 'CHECKOUT_ERROR',
      resource_type: 'transaction',
      resource_id: transaction.id,
      details: { tx_ref: txRef, error: errorMessage, is_timeout: isTimeout },
    });

    return new Response(
      JSON.stringify({ error: isTimeout ? 'Checkout initialization timed out. Please retry.' : 'Checkout initialization failed due to network error' }),
      { status: 502, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }
});
