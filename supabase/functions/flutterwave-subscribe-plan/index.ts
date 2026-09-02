// ============================================================================
// ExamForge AI — Flutterwave Subscription Plan Subscription Edge Function
// ============================================================================
// Subscribes a customer to a Flutterwave payment plan.
// Must be server-side because it requires the Flutterwave secret key.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';
import { validateAuth, hasRole, isSuperAdmin, isAdmin } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: combineHeaders(corsHeaders) });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) });
  }

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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');

  if (!flutterwaveSecretKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }

  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) }); }

  const { email, planCode, amount } = body;
  if (!email || !planCode) {
    return new Response(JSON.stringify({ error: 'Missing required fields: email, planCode' }), { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }

  // Create subscription checkout via Flutterwave
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const subscriptionPayload: Record<string, any> = {
      tx_ref: `sub_${Date.now()}_${user.id.substring(0, 8)}`,
      amount: amount ? parseFloat(amount) : undefined,
      currency: 'NGN',
      redirect_url: `${Deno.env.get('APP_URL') || 'https://app.examforge.ai'}/payment/callback`,
      customer: { email },
      plan: planCode,
      customizations: { title: 'ExamForge AI Subscription', logo: 'https://examforge.ai/logo.png' },
      meta: { user_id: user.id },
    };

    const flwResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${flutterwaveSecretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(subscriptionPayload),
      signal: controller.signal,
    });

    const flwData = await flwResponse.json();
    clearTimeout(timeoutId);

    if (flwData.status !== 'success' || !flwData.data?.link) {
      return new Response(JSON.stringify({ error: 'Failed to initialize subscription', details: flwData.message }), { status: 502, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
    }

    // Audit log
    await adminClient.from('audit_log').insert({
      user_id: user.id,
      action: 'SUBSCRIPTION_INITIALIZED',
      resource_type: 'subscription',
      details: { plan_code: planCode, email },
    });

    return new Response(JSON.stringify({
      checkoutUrl: flwData.data.link,
      txRef: subscriptionPayload.tx_ref,
    }), { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  } catch (err) {
    clearTimeout(timeoutId);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return new Response(JSON.stringify({ error: isTimeout ? 'Subscription timed out' : 'Subscription failed' }), { status: 502, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) });
  }
});
