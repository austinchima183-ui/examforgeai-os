// ============================================================================
// ExamForge AI — Shared Security Headers
// ============================================================================
// Security headers applied to ALL Edge Function responses.
// These headers protect against XSS, clickjacking, MIME sniffing, and more.

export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    ...getHstsHeader(),
  };
}

function getHstsHeader(): Record<string, string> {
  const env = Deno.env.get('ENVIRONMENT') || 'development';
  if (env === 'production') {
    return {
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    };
  }
  return {};
}

/**
 * Combine CORS headers, security headers, and any extra headers.
 * Security headers are applied last to ensure they cannot be overridden.
 */
export function combineHeaders(
  corsHeaders: Record<string, string>,
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    ...corsHeaders,
    ...extra,
    ...getSecurityHeaders(),
  };
}
