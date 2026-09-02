// ============================================================================
// ExamForge AI — Server-Side Payment Operations Edge Function
// ============================================================================
// This Edge Function handles ALL Flutterwave operations that require the
// secret key. The Flutter client must NEVER have access to this key.
//
// Supported operations:
//   1. verify-payment  — Verify a Flutterwave payment server-side
//   2. initiate-refund — Request a refund through Flutterwave
//
// SECURITY MODEL:
//   - All requests require a valid Supabase JWT (authenticated user)
//   - The FLUTTERWAVE_SECRET_KEY is loaded from environment variables
//     and never exposed to the client
//   - All operations are audit-logged
//   - Rate limiting via shared rate_limiter module
//   - Security headers applied via shared security_headers module
//   - 30s timeout on all external API calls
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';
import { validateAuth, hasRole, isSuperAdmin, isAdmin } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight — include security headers
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

  // ─── Environment & secrets ────────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const flutterwaveSecretKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY')!;

  if (!flutterwaveSecretKey) {
    console.error('FLUTTERWAVE_SECRET_KEY not configured');
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });
  }

  // Create admin client for privileged operations
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
      // ─── VERIFY PAYMENT ──────────────────────────────────────────────
      case 'verify-payment': {
        const { transaction_id, tx_ref } = body;

        if (!transaction_id && !tx_ref) {
          return new Response(
            JSON.stringify({ error: 'transaction_id or tx_ref required' }),
            { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
          );
        }

        // Call Flutterwave API with secret key (server-side only)
        const flwUrl = transaction_id
          ? `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`
          : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${tx_ref}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30_000);

        const flwResponse = await fetch(flwUrl, {
          headers: {
            'Authorization': `Bearer ${flutterwaveSecretKey}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const flwData = await flwResponse.json();

        // Verify amount matches our records
        if (flwData.status === 'success' && flwData.data) {
          const { data: localTx } = await adminClient
            .from('transactions')
            .select('id, amount, currency, status')
            .eq('flutterwave_tx_ref', flwData.data.tx_ref || tx_ref)
            .maybeSingle();

          if (localTx) {
            const chargedAmount = parseFloat(flwData.data.charged_amount) || 0;
            const expectedAmount = parseFloat(localTx.amount) || 0;

            if (Math.abs(chargedAmount - expectedAmount) > 1.0) {
              // Amount mismatch — potential fraud
              await adminClient.from('audit_log').insert({
                user_id: user.id,
                action: 'PAYMENT_AMOUNT_MISMATCH',
                resource_type: 'transaction',
                resource_id: localTx.id,
                details: {
                  expected: expectedAmount,
                  charged: chargedAmount,
                  tx_ref: flwData.data.tx_ref,
                },
              });

              return new Response(
                JSON.stringify({
                  verified: false,
                  error: 'Amount mismatch',
                  status: flwData.data.status,
                }),
                { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
              );
            }

            // Update transaction status
            if (flwData.data.status === 'successful' && localTx.status !== 'successful') {
              await adminClient
                .from('transactions')
                .update({
                  status: 'successful',
                  flutterwave_transaction_id: flwData.data.id?.toString(),
                  verified_at: new Date().toISOString(),
                  completed_at: new Date().toISOString(),
                })
                .eq('id', localTx.id);
            }
          }
        }

        // Audit log
        await adminClient.from('audit_log').insert({
          user_id: user.id,
          action: 'PAYMENT_VERIFICATION',
          resource_type: 'transaction',
          details: {
            operation: 'verify-payment',
            tx_ref: tx_ref,
            transaction_id: transaction_id,
            flutterwave_status: flwData.data?.status,
          },
        });

        return new Response(
          JSON.stringify({
            verified: flwData.status === 'success' && flwData.data?.status === 'successful',
            status: flwData.data?.status,
            amount: flwData.data?.amount,
            currency: flwData.data?.currency,
          }),
          { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
        );
      }

      // ─── INITIATE REFUND ─────────────────────────────────────────────
      case 'initiate-refund': {
        const { transaction_id, amount, reason } = body;

        if (!transaction_id) {
          return new Response(
            JSON.stringify({ error: 'transaction_id required' }),
            { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
          );
        }

        // Verify the user is authorized for this refund
        const { data: localTx } = await adminClient
          .from('transactions')
          .select('id, user_id, amount, status, school_id')
          .eq('flutterwave_transaction_id', transaction_id.toString())
          .maybeSingle();

        if (!localTx) {
          return new Response(
            JSON.stringify({ error: 'Transaction not found' }),
            { status: 404, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
          );
        }

        // Check authorization: user must own the transaction or be an admin
        const userIsAdmin = isAdmin(authResult);
        const isOwner = localTx.user_id === user.id;

        if (!userIsAdmin && !isOwner) {
          return new Response(
            JSON.stringify({ error: 'Not authorized to refund this transaction' }),
            { status: 403, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
          );
        }

        // Call Flutterwave refund API
        const refundPayload: Record<string, any> = {
          amount: amount ? parseFloat(amount) : undefined,
          reason: reason || 'Customer requested refund',
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30_000);

        const flwResponse = await fetch(
          `https://api.flutterwave.com/v3/transactions/${transaction_id}/refund`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${flutterwaveSecretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(refundPayload),
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        const flwData = await flwResponse.json();

        // Audit log
        await adminClient.from('audit_log').insert({
          user_id: user.id,
          action: 'REFUND_INITIATED',
          resource_type: 'transaction',
          resource_id: localTx.id,
          details: {
            transaction_id,
            amount: refundPayload.amount,
            reason,
            flutterwave_response: flwData.status,
          },
        });

        return new Response(
          JSON.stringify({
            success: flwData.status === 'success',
            refund_id: flwData.data?.id,
            status: flwData.data?.status,
          }),
          { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${operation}` }),
          { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
        );
    }
  } catch (err) {
    console.error(`Payment operation error: ${err}`);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) },
    );
  }
});
