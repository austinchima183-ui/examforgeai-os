// ============================================================================
// ExamForge AI — Marketplace Secure Download Edge Function
// ============================================================================
// Generates time-limited signed URLs for marketplace product downloads.
// All downloads MUST go through this function — never expose Storage
// URLs directly to the client.
//
// Uses shared utilities for CORS, security headers, rate limiting, and auth.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';
import { validateAuth, hasRole, isSuperAdmin, isAdmin } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // ─── Handle CORS preflight ────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: combineHeaders(corsHeaders, getSecurityHeaders()) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Validate authentication via shared utility ───────────────────────────
  const authResult = await validateAuth(req);
  if (authResult.error || !authResult.user) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const user = authResult.user;

  // ─── Rate limiting ────────────────────────────────────────────────────────
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

  // Create admin client for privileged operations
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { purchaseId, productId } = body;

    if (!purchaseId || !productId) {
      return new Response(JSON.stringify({ error: 'Missing purchaseId or productId' }), {
        status: 400,
        headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
      });
    }

    // ─── Verify the purchase belongs to this user ────────────────────────
    const { data: purchase, error: purchaseError } = await adminClient
      .from('marketplace_purchases')
      .select('id, buyer_id, product_id, status, seller_id')
      .eq('id', purchaseId)
      .eq('buyer_id', user.id)
      .eq('status', 'completed')
      .maybeSingle();

    if (purchaseError || !purchase) {
      console.warn('[AUDIT] Download denied — purchase not found or not completed', {
        userId: user.id,
        purchaseId,
        productId,
        reason: purchaseError ? 'db_error' : 'not_found_or_not_completed',
      });
      return new Response(JSON.stringify({ error: 'Purchase not found or not completed' }), {
        status: 403,
        headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
      });
    }

    if (purchase.product_id !== productId) {
      console.warn('[AUDIT] Download denied — product does not match purchase', {
        userId: user.id,
        purchaseId,
        productId,
        actualProductId: purchase.product_id,
      });
      return new Response(JSON.stringify({ error: 'Product does not match purchase' }), {
        status: 403,
        headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
      });
    }

    // ─── Get product file info ───────────────────────────────────────────
    const { data: product, error: productError } = await adminClient
      .from('marketplace_products')
      .select('id, file_storage_path, file_name, seller_id, status')
      .eq('id', productId)
      .eq('status', 'published')
      .maybeSingle();

    if (productError || !product || !product.file_storage_path) {
      console.warn('[AUDIT] Download denied — product not available', {
        userId: user.id,
        purchaseId,
        productId,
        reason: productError ? 'db_error' : 'not_found_or_no_file',
      });
      return new Response(JSON.stringify({ error: 'Product not available' }), {
        status: 404,
        headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
      });
    }

    // ─── Generate download token ─────────────────────────────────────────
    const { data: tokenResult, error: tokenError } = await adminClient.rpc(
      'generate_download_token',
      {
        p_purchase_id: purchaseId,
        p_product_id: productId,
        p_buyer_id: user.id,
        p_seller_id: purchase.seller_id || product.seller_id,
        p_file_path: product.file_storage_path,
        p_file_name: product.file_name || 'download',
        p_max_downloads: 5,
        p_expiry_hours: 24,
      }
    );

    if (tokenError || !tokenResult) {
      console.error('[AUDIT] Download token generation failed', {
        userId: user.id,
        purchaseId,
        productId,
        error: tokenError?.message,
      });
      return new Response(JSON.stringify({ error: 'Failed to generate download token' }), {
        status: 500,
        headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
      });
    }

    // ─── Create signed URL for the file ──────────────────────────────────
    const { data: signedUrlData, error: signedUrlError } = await adminClient.storage
      .from('marketplace-products')
      .createSignedUrl(product.file_storage_path, 3600, {
        download: true,
        transform: undefined,
      });

    if (signedUrlError || !signedUrlData) {
      console.error('[AUDIT] Signed URL creation failed', {
        userId: user.id,
        purchaseId,
        productId,
        filePath: product.file_storage_path,
        error: signedUrlError?.message,
      });
      return new Response(JSON.stringify({ error: 'Failed to create download URL' }), {
        status: 500,
        headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
      });
    }

    // ─── Audit log for successful download ───────────────────────────────
    console.info('[AUDIT] Download URL generated successfully', {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      purchaseId,
      productId,
      sellerId: purchase.seller_id || product.seller_id,
      fileName: product.file_name || 'download',
      tokenGenerated: true,
    });

    // ─── Return download info ────────────────────────────────────────────
    return new Response(JSON.stringify({
      downloadUrl: signedUrlData.signedUrl,
      token: tokenResult,
      fileName: product.file_name || 'download',
      expiresIn: 3600, // 1 hour for signed URL
    }), {
      status: 200,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });

  } catch (err) {
    console.error('[AUDIT] Download function error', {
      userId: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }),
    });
  }
});
