// ============================================================================
// ExamForge AI — Flutterwave Payment Plan Creation Edge Function
// ============================================================================
// Creates a recurring payment plan via Flutterwave.
// Must be server-side because it requires the Flutterwave secret key.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';
import { validateAuth, hasRole, isSuperAdmin, isAdmin } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: combineHeaders(corsHeaders, getSecurityHeaders()) });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) });
  }

  // Authenticate
  const authResult = await validateAuth(req);
  if (authResult.error || !authResult.user) {
    return new Response(JSON.stringify({ error: authResult.error }), { status: authResult.status, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) });
  }
  const user = authResult.user;

  // Rate limiting
  const rateLimitResult = checkRateLimit(user.id);
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
  if (!rateLimitResult.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }

  // Authorize: only super_admin or school_admin can create plans
  if (!isAdmin(authResult)) {
    return new Response(JSON.stringify({ error: 'Forbidden — insufficient permissions' }), { status: 403, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');

  if (!flutterwaveSecretKey) {
    console.error('FLUTTERWAVE_SECRET_KEY not configured');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  // Parse and validate request
  let body: Record<string, any>;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) }); }

  const { name, amount, currency, interval } = body;
  if (!name || !amount || !currency || !interval) {
    return new Response(JSON.stringify({ error: 'Missing required fields: name, amount, currency, interval' }), { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return new Response(JSON.stringify({ error: 'Amount must be a positive number' }), { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }

  const validIntervals = ['daily', 'weekly', 'monthly', 'quarterly', 'biannually', 'annually'];
  if (!validIntervals.includes(interval.toLowerCase())) {
    return new Response(JSON.stringify({ error: `Invalid interval. Must be one of: ${validIntervals.join(', ')}` }), { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }

  const supportedCurrencies = ['NGN', 'USD', 'GBP', 'EUR', 'KES', 'GHS', 'ZAR'];
  const normalizedCurrency = currency.toUpperCase();
  if (!supportedCurrencies.includes(normalizedCurrency)) {
    return new Response(JSON.stringify({ error: `Unsupported currency: ${currency}` }), { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }

  // Call Flutterwave API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const flwResponse = await fetch('https://api.flutterwave.com/v3/payment-plans', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${flutterwaveSecretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, amount: parsedAmount, currency: normalizedCurrency, interval: interval.toLowerCase() }),
      signal: controller.signal,
    });

    const flwData = await flwResponse.json();
    clearTimeout(timeoutId);

    if (flwData.status !== 'success') {
      return new Response(JSON.stringify({ error: 'Failed to create payment plan', details: flwData.message || 'Unknown error' }), { status: 502, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
    }

    // Audit log
    await adminClient.from('audit_log').insert({
      user_id: user.id,
      action: 'PAYMENT_PLAN_CREATED',
      resource_type: 'payment_plan',
      details: { plan_id: flwData.data?.id, name, amount: parsedAmount, currency: normalizedCurrency, interval },
    });

    return new Response(JSON.stringify({
      planId: flwData.data?.id,
      name: flwData.data?.name,
      amount: flwData.data?.amount,
      currency: flwData.data?.currency,
      interval: flwData.data?.interval,
      planCode: flwData.data?.plan_code,
    }), { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return new Response(JSON.stringify({ error: isTimeout ? 'Plan creation timed out' : 'Plan creation failed' }), { status: 502, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }
});
